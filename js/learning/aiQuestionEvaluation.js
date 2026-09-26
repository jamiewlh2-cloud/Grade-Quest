import { generateOllamaQuestionProposals } from './aiQuestionGenerator.js';

let extractedDocument = null;
let selectedFile = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getPlans() {
  return window.getGradeQuestLearningState?.()?.plans || [];
}

function setStatus(message, tone = '') {
  const status = document.getElementById('aiQuestionEvaluationStatus');
  if (!status) return;
  status.className = `ai-evaluation-status${tone ? ` is-${tone}` : ''}`;
  status.textContent = message;
}

function renderPlanOptions() {
  const select = document.getElementById('aiEvaluationStudyPlan');
  if (!select) return;
  const plans = getPlans();
  const current = select.value;
  select.innerHTML = '<option value="">Choose a StudyPlan</option>' + plans.map(plan => `
    <option value="${escapeHtml(plan.studyPlanId)}">${escapeHtml(plan.name)} - ${escapeHtml(plan.courseId)}</option>
  `).join('');
  if (plans.some(plan => plan.studyPlanId === current)) select.value = current;
}

function getSelectedPlan() {
  const planId = document.getElementById('aiEvaluationStudyPlan')?.value;
  return getPlans().find(plan => plan.studyPlanId === planId) || null;
}

function renderExtractedSummary() {
  const summary = document.getElementById('aiEvaluationExtractionSummary');
  const range = document.getElementById('aiEvaluationRange');
  if (!summary || !range || !extractedDocument) return;
  const paragraphs = extractedDocument.paragraphs || [];
  const characters = paragraphs.reduce((total, paragraph) => total + String(paragraph.text || '').length, 0);
  summary.innerHTML = `<strong>${paragraphs.length} extracted paragraphs</strong><span>${characters.toLocaleString()} characters. Choose a short contiguous range before sending it to Ollama.</span>`;
  range.hidden = false;
  document.getElementById('aiEvaluationStart').max = String(Math.max(0, paragraphs.length - 1));
  document.getElementById('aiEvaluationCount').max = String(Math.max(1, paragraphs.length));
}

function renderProposals(proposals) {
  const output = document.getElementById('aiEvaluationResults');
  if (!output) return;
  if (!proposals.length) {
    output.innerHTML = '<div class="workspace-empty-state"><strong>No supportable proposals returned.</strong><span>The model abstained for this selected material.</span></div>';
    return;
  }
  output.innerHTML = proposals.map((proposal, index) => `
    <article class="ai-proposal" data-proposal-id="${escapeHtml(proposal.proposalId)}">
      <div class="ai-proposal-heading"><span>Proposal ${index + 1}</span><span class="ai-proposal-status">Pending review</span></div>
      <h4>${escapeHtml(proposal.candidate.prompt)}</h4>
      <dl class="ai-proposal-fields">
        <div><dt>Answer</dt><dd>${escapeHtml(proposal.candidate.answer)}</dd></div>
        <div><dt>Explanation</dt><dd>${escapeHtml(proposal.candidate.explanation)}</dd></div>
        <div><dt>Concept</dt><dd>${escapeHtml(proposal.candidate.conceptLabel)}</dd></div>
      </dl>
      <div class="ai-evidence"><strong>Evidence</strong>${proposal.sourceReferences.map(reference => `
        <blockquote><span>${escapeHtml(reference.blockId)} - page ${escapeHtml(reference.pageNumber)}</span>${escapeHtml(reference.excerpt)}</blockquote>
      `).join('')}</div>
    </article>
  `).join('');
}

async function extractSelectedPdf() {
  const plan = getSelectedPlan();
  const file = document.getElementById('aiEvaluationPdf')?.files?.[0];
  if (!plan) return setStatus('Choose an existing StudyPlan first.', 'error');
  if (!file) return setStatus('Choose a PDF first.', 'error');
  if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return setStatus('Only PDF files are supported by this prototype.', 'error');
  }

  selectedFile = file;
  extractedDocument = null;
  renderProposals([]);
  setStatus('Extracting PDF text. Scanned PDFs may take longer.', 'working');
  try {
    extractedDocument = await window.PDFImportSharedPipeline.extractImportDocument(file);
    renderExtractedSummary();
    setStatus('Extraction complete. Inspect the range, then generate proposals.', 'success');
  } catch (error) {
    setStatus(error.message || 'PDF extraction failed.', 'error');
  }
}

async function generateProposals() {
  const plan = getSelectedPlan();
  if (!plan || !extractedDocument || !selectedFile) return setStatus('Extract a PDF before generating proposals.', 'error');
  const start = Number(document.getElementById('aiEvaluationStart')?.value || 0);
  const count = Number(document.getElementById('aiEvaluationCount')?.value || 1);
  const paragraphs = (extractedDocument.paragraphs || []).slice(start, start + count);
  if (!paragraphs.length) return setStatus('Choose a range containing extracted paragraphs.', 'error');

  setStatus('Sending the selected extracted blocks to local Ollama.', 'working');
  try {
    const result = await generateOllamaQuestionProposals({
      paragraphs,
      sourceId: `temporary-${selectedFile.name}-${selectedFile.size}`,
      studyPlanId: plan.studyPlanId,
      studyPlans: [plan],
      sourceCourseId: plan.courseId,
      maxProposals: 10,
    });
    renderProposals(result.proposals);
    setStatus(`${result.proposals.length} temporary proposal${result.proposals.length === 1 ? '' : 's'} generated. Review each answer against its evidence.`, 'success');
  } catch (error) {
    setStatus(error.message || 'Question generation failed.', 'error');
  }
}

function render() {
  const container = document.getElementById('aiQuestionEvaluation');
  if (!container) return;
  container.innerHTML = `
    <div class="ai-evaluation-form">
      <label>StudyPlan<select id="aiEvaluationStudyPlan"></select></label>
      <label>Course PDF<input id="aiEvaluationPdf" type="file" accept=".pdf,application/pdf"></label>
      <div class="ai-evaluation-actions">
        <button type="button" class="button-secondary" id="aiEvaluationExtract">Extract PDF</button>
        <button type="button" class="button-primary" id="aiEvaluationGenerate" disabled>Generate proposals</button>
      </div>
    </div>
    <div id="aiEvaluationStatus" class="ai-evaluation-status" role="status" aria-live="polite">Choose a StudyPlan and PDF to begin.</div>
    <div id="aiEvaluationExtractionSummary" class="ai-evaluation-summary"></div>
    <div id="aiEvaluationRange" class="ai-evaluation-range" hidden>
      <label>Start paragraph<input id="aiEvaluationStart" type="number" min="0" value="0"></label>
      <label>Paragraphs to send<input id="aiEvaluationCount" type="number" min="1" max="10" value="10"></label>
    </div>
    <div id="aiEvaluationResults" class="ai-evaluation-results"></div>
  `;
  renderPlanOptions();
  document.getElementById('aiEvaluationExtract').addEventListener('click', extractSelectedPdf);
  document.getElementById('aiEvaluationGenerate').addEventListener('click', generateProposals);
  document.getElementById('aiEvaluationPdf').addEventListener('change', event => {
    document.getElementById('aiEvaluationGenerate').disabled = !event.target.files?.length;
  });
}

window.addEventListener('DOMContentLoaded', render);
window.addEventListener('gradequest:learning-state-changed', renderPlanOptions);