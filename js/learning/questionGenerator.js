import { QUESTION_PROPOSAL_STATUS, validateQuestionProposal } from './questionProposalSchema.js';

const MAX_PROPOSALS = 20;
const TERM_DEFINITION_PATTERN = /^([^:\n]{2,80}):\s+(.{12,500})$/;

function proposalIdFor(studyPlanId, sourceId, paragraphIndex, term) {
  return [studyPlanId, sourceId, paragraphIndex, term]
    .map(value => encodeURIComponent(String(value)))
    .join(':');
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function generateQuestionProposals({
  document,
  studyPlanId,
  studyPlans,
  sourceId,
  sourceCourseId,
  maxProposals = MAX_PROPOSALS,
} = {}) {
  if (!document || !Array.isArray(document.paragraphs)) {
    throw new Error('An extracted document with paragraphs is required.');
  }
  if (!isNonEmptyString(studyPlanId)) {
    throw new Error('A target studyPlanId is required.');
  }
  if (!isNonEmptyString(sourceId)) {
    throw new Error('A sourceId is required for proposal provenance.');
  }
  if (!Number.isInteger(maxProposals) || maxProposals < 1 || maxProposals > MAX_PROPOSALS) {
    throw new Error(`maxProposals must be an integer from 1 to ${MAX_PROPOSALS}.`);
  }

  const studyPlan = Array.isArray(studyPlans)
    ? studyPlans.find(plan => plan && plan.studyPlanId === studyPlanId)
    : null;
  if (!studyPlan || !studyPlan.courseId) {
    throw new Error('The target StudyPlan must exist and include a courseId.');
  }
  if (sourceCourseId && sourceCourseId !== studyPlan.courseId) {
    throw new Error('The source course does not match the target StudyPlan course.');
  }

  const proposals = [];
  let skippedCount = 0;

  for (const [position, paragraph] of document.paragraphs.entries()) {
    const text = typeof paragraph?.text === 'string' ? paragraph.text.trim() : '';
    const match = text.match(TERM_DEFINITION_PATTERN);
    if (!match || !text) {
      skippedCount += 1;
      continue;
    }
    if (proposals.length >= maxProposals) {
      skippedCount += 1;
      continue;
    }

    const term = match[1].trim();
    const definition = match[2].trim();
    const paragraphIndex = Number.isInteger(paragraph.index) && paragraph.index >= 0
      ? paragraph.index
      : position;
    const pageNumber = Number.isInteger(paragraph.pageNumber) && paragraph.pageNumber >= 0
      ? paragraph.pageNumber
      : 0;
    const lineIndex = Number.isInteger(paragraph.lineIndex) && paragraph.lineIndex >= 0
      ? paragraph.lineIndex
      : position;
    const proposal = {
      proposalId: proposalIdFor(studyPlanId, sourceId, paragraphIndex, term),
      studyPlanId,
      candidate: {
        type: 'single-answer',
        prompt: `What is ${term}?`,
        answer: definition,
        explanation: `The uploaded material defines ${term} as: ${definition}`,
        conceptLabel: term,
      },
      sourceReference: {
        sourceId,
        ...(sourceCourseId ? { courseId: sourceCourseId } : {}),
        paragraphIndex,
        pageNumber,
        lineIndex,
        excerpt: typeof paragraph.sourceText === 'string' && paragraph.sourceText.trim()
          ? paragraph.sourceText.trim()
          : text,
      },
      provenance: {
        generator: 'explicit-term-definition',
        version: 1,
      },
      status: QUESTION_PROPOSAL_STATUS,
    };

    proposals.push(validateQuestionProposal(proposal, { studyPlans }));
  }

  return {
    proposals,
    diagnostics: {
      examinedCount: document.paragraphs.length,
      proposedCount: proposals.length,
      skippedCount,
      warnings: skippedCount
        ? ['Only explicit single-line term-definition entries were used; other paragraphs were skipped.']
        : [],
    },
  };
}