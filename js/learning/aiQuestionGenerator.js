import { QUESTION_PROPOSAL_STATUS, validateQuestionProposal } from './questionProposalSchema.js';

const MAX_SOURCE_CHARACTERS = 6000;
const MAX_PROPOSALS = 10;
const MODEL = 'qwen3-coder:latest';
const PROVIDER = 'ollama';

function requireText(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} is required.`);
  }
  return value.trim();
}

function findStudyPlan(studyPlanId, studyPlans) {
  const plan = Array.isArray(studyPlans)
    ? studyPlans.find(candidate => candidate && candidate.studyPlanId === studyPlanId)
    : null;
  if (!plan || !plan.courseId) {
    throw new Error('The target StudyPlan must exist and include a courseId.');
  }
  return plan;
}

function normalizeBlocks(paragraphs, sourceId) {
  if (!Array.isArray(paragraphs) || paragraphs.length === 0) {
    throw new Error('At least one selected extracted paragraph is required.');
  }

  const blocks = paragraphs.map((paragraph, position) => {
    const text = requireText(paragraph?.text, `Selected paragraph ${position + 1} text`);
    return {
      blockId: `p-${Number.isInteger(paragraph.index) ? paragraph.index : position}`,
      paragraphIndex: Number.isInteger(paragraph.index) && paragraph.index >= 0 ? paragraph.index : position,
      pageNumber: Number.isInteger(paragraph.pageNumber) && paragraph.pageNumber >= 0 ? paragraph.pageNumber : 0,
      lineIndex: Number.isInteger(paragraph.lineIndex) && paragraph.lineIndex >= 0 ? paragraph.lineIndex : position,
      text,
      sourceId,
    };
  });

  const characterCount = blocks.reduce((total, block) => total + block.text.length, 0);
  if (characterCount > MAX_SOURCE_CHARACTERS) {
    throw new Error(`Selected source exceeds the ${MAX_SOURCE_CHARACTERS.toLocaleString('en-US')}-character prototype limit.`);
  }
  return blocks;
}

export function createQuestionGenerationRequest({
  paragraphs,
  sourceId,
  studyPlanId,
  studyPlans,
  sourceCourseId,
  maxProposals = MAX_PROPOSALS,
} = {}) {
  const source = requireText(sourceId, 'sourceId');
  const planId = requireText(studyPlanId, 'studyPlanId');
  const plan = findStudyPlan(planId, studyPlans);
  if (sourceCourseId && sourceCourseId !== plan.courseId) {
    throw new Error('The source course does not match the target StudyPlan course.');
  }
  if (!Number.isInteger(maxProposals) || maxProposals < 1 || maxProposals > MAX_PROPOSALS) {
    throw new Error(`maxProposals must be an integer from 1 to ${MAX_PROPOSALS}.`);
  }

  const blocks = normalizeBlocks(paragraphs, source);
  return { blocks, maxProposals, sourceId: source, studyPlanId: planId, studyPlan: plan };
}

export function buildQuestionGenerationPrompt({ blocks, maxProposals = MAX_PROPOSALS } = {}) {
  if (!Array.isArray(blocks) || !blocks.length) {
    throw new Error('Question-generation blocks are required.');
  }
  const sourcePayload = blocks.map(({ blockId, paragraphIndex, pageNumber, lineIndex, text }) => ({
    blockId, paragraphIndex, pageNumber, lineIndex, text,
  }));
  return [
    'Generate source-grounded study-question proposals from the supplied uploaded material.',
    'Use only the supplied blocks. No web browsing, internet search, external retrieval, or tools. Do not use outside facts.',
    'Return JSON only as an object with a "proposals" array containing no more than the requested maximum.',
    'Each proposal must contain: type (single-answer only), prompt, answer, explanation, conceptLabel, and evidenceBlockIds.',
    'Every evidenceBlockIds value must name one or more supplied blockId values.',
    'Abstain and return an empty array when the material is insufficient, ambiguous, or unsupported.',
    `Requested maximum proposals: ${maxProposals}`,
    'Selected extracted blocks:',
    JSON.stringify(sourcePayload),
  ].join('\n');
}

function parseJsonResponse(rawResponse) {
  const text = typeof rawResponse === 'string' ? rawResponse.trim() : JSON.stringify(rawResponse);
  const withoutFences = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  const parsed = JSON.parse(withoutFences);
  const proposals = Array.isArray(parsed) ? parsed : parsed?.proposals;
  if (!Array.isArray(proposals)) {
    throw new Error('AI response must contain a proposals array.');
  }
  return proposals;
}

function buildSourceReference(block, sourceCourseId) {
  return {
    sourceId: block.sourceId,
    ...(sourceCourseId ? { courseId: sourceCourseId } : {}),
    blockId: block.blockId,
    paragraphIndex: block.paragraphIndex,
    pageNumber: block.pageNumber,
    lineIndex: block.lineIndex,
    excerpt: block.text,
  };
}

export function mapQuestionGenerationResponse(rawResponse, request, {
  sourceCourseId,
  generatedAt = new Date().toISOString(),
} = {}) {
  const returnedProposals = parseJsonResponse(rawResponse);
  if (returnedProposals.length > request.maxProposals) {
    throw new Error('AI response exceeded the proposal limit.');
  }
  const blocksById = new Map(request.blocks.map(block => [block.blockId, block]));
  const proposals = returnedProposals.map((candidate, index) => {
    if (!candidate || candidate.type !== 'single-answer'
      || !requireText(candidate.prompt, `Proposal ${index + 1} prompt`)
      || !requireText(candidate.answer, `Proposal ${index + 1} answer`)
      || !requireText(candidate.explanation, `Proposal ${index + 1} explanation`)
      || !requireText(candidate.conceptLabel, `Proposal ${index + 1} conceptLabel`)
      || !Array.isArray(candidate.evidenceBlockIds) || candidate.evidenceBlockIds.length === 0) {
      throw new Error(`Proposal ${index + 1} is incomplete or unsupported.`);
    }
    const references = candidate.evidenceBlockIds.map(blockId => {
      const block = blocksById.get(blockId);
      if (!block) throw new Error(`Proposal ${index + 1} cites an unknown evidence block.`);
      return buildSourceReference(block, sourceCourseId);
    });
    const proposal = {
      proposalId: `${request.studyPlanId}:${request.sourceId}:ollama:${index + 1}`,
      studyPlanId: request.studyPlanId,
      candidate: {
        type: 'single-answer',
        prompt: candidate.prompt.trim(),
        answer: candidate.answer.trim(),
        explanation: candidate.explanation.trim(),
        conceptLabel: candidate.conceptLabel.trim(),
      },
      sourceReferences: references,
      provenance: {
        generator: 'ollama-question-generation',
        provider: PROVIDER,
        model: MODEL,
        promptVersion: 1,
        version: 1,
        generatedAt,
      },
      status: QUESTION_PROPOSAL_STATUS,
    };
    return validateQuestionProposal(proposal, { studyPlans: [request.studyPlan] });
  });
  return proposals;
}

export async function generateOllamaQuestionProposals({
  file,
  paragraphs,
  sourceId,
  studyPlanId,
  studyPlans,
  sourceCourseId,
  maxProposals = MAX_PROPOSALS,
  extractionPipeline = globalThis.PDFImportSharedPipeline,
  fetchImplementation = globalThis.fetch,
  generatedAt,
} = {}) {
  let selectedParagraphs = paragraphs;
  if (!selectedParagraphs) {
    if (!file || !extractionPipeline?.extractImportDocument) {
      throw new Error('A file and the shared PDF extraction pipeline are required.');
    }
    const document = await extractionPipeline.extractImportDocument(file);
    selectedParagraphs = document.paragraphs;
  }
  const request = createQuestionGenerationRequest({
    paragraphs: selectedParagraphs,
    sourceId,
    studyPlanId,
    studyPlans,
    sourceCourseId,
    maxProposals,
  });
  if (typeof fetchImplementation !== 'function') throw new Error('A fetch implementation is required.');
  const response = await fetchImplementation('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      prompt: buildQuestionGenerationPrompt(request),
      stream: false,
      format: 'json',
    }),
  });
  if (!response.ok) throw new Error(`Ollama question-generation request failed with status ${response.status}`);
  const payload = await response.json();
  const rawResponse = typeof payload?.response === 'string' ? payload.response : '';
  return {
    proposals: mapQuestionGenerationResponse(rawResponse, request, { sourceCourseId, generatedAt }),
    request: { sourceId: request.sourceId, studyPlanId: request.studyPlanId, blockCount: request.blocks.length },
  };
}