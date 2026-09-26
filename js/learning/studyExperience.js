import {
  completeSession,
  createLearningSession,
  getCurrentQuestion,
  getSessionProgress,
  pauseSession,
  resumeSession,
  startSession,
  submitResponse,
} from './sessionCoordinator.js';

let mountedContainer = null;
let activeSession = null;
let activeQuestion = null;
let selectedAnswers = [];
let confidence = 'uncertain';
let studyContext = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getAnswerValue(option) {
  return typeof option === 'object' ? String(option.value ?? option.id ?? option.label ?? '') : String(option);
}

function getAnswerLabel(option) {
  return typeof option === 'object' ? String(option.label ?? option.value ?? option.id ?? '') : String(option);
}

function getQuestionOptions(question) {
  return Array.isArray(question?.options) ? question.options : [];
}

function getSubmittedResponse() {
  if (selectedAnswers.length === 0) return null;
  return selectedAnswers.length === 1 ? selectedAnswers[0] : [...selectedAnswers];
}

function getConfidenceLabel() {
  if (confidence === 'certain') return 'Confident';
  if (confidence === 'uncertain') return 'Uncertain';
  return 'Unconfident';
}

function renderEmptyState() {
  mountedContainer.innerHTML = `
    <section class="learning-study-empty" aria-labelledby="learningStudyTitle">
      <div>
        <p class="eyebrow">Adaptive learning</p>
        <h3 id="learningStudyTitle">Choose a study plan to begin.</h3>
        <p class="notes-line">Learning questions, progress, and sessions stay inside one StudyPlan.</p>
      </div>
      <p class="learning-study-status" role="status">No study plan session is active.</p>
    </section>
  `;
}

function renderPlanHeader() {
  const progress = getSessionProgress(activeSession);
  const planName = studyContext?.studyPlanName || activeSession.studyPlanId;
  return `
    <div class="learning-study-header">
      <div>
        <p class="eyebrow">${escapeHtml(planName)}</p>
        <h3>Retrieval practice</h3>
      </div>
      <div class="learning-study-progress" aria-label="Session progress">
        <span>${escapeHtml(progress.pass)}</span>
        <strong>${progress.position}/${progress.total}</strong>
      </div>
    </div>
  `;
}

function renderQuestion() {
  const options = getQuestionOptions(activeQuestion);
  const multiple = Array.isArray(activeQuestion.correctAnswer);
  const selectedCount = selectedAnswers.length;
  const selectionHint = selectedCount === 2 ? 'Two choices selected: uncertain between options.' : `Confidence: ${getConfidenceLabel()}`;

  return `
    <div class="learning-question" aria-live="polite">
      <p class="learning-question-count">Question ${activeSession.cursor + 1}</p>
      <h4>${escapeHtml(activeQuestion.prompt)}</h4>
      <div class="learning-answer-list" role="group" aria-label="Answer choices">
        ${options.map((option, index) => {
          const value = getAnswerValue(option);
          const selected = selectedAnswers.includes(value);
          return `<button type="button" class="learning-answer ${selected ? 'is-selected' : ''}" data-answer-value="${escapeHtml(value)}" aria-pressed="${selected}" onclick="window.selectLearningAnswer(this.dataset.answerValue, ${multiple}, event)">
            <span class="learning-answer-marker" aria-hidden="true">${String.fromCharCode(65 + index)}</span>
            <span>${escapeHtml(getAnswerLabel(option))}</span>
          </button>`;
        }).join('')}
      </div>
      <p class="learning-confidence-hint" role="status">${escapeHtml(selectionHint)}</p>
      <div class="learning-study-actions">
        <button type="button" class="button-secondary" onclick="window.commitLearningAnswer('uncertain')" ${selectedCount ? '' : 'disabled'}>Submit uncertain</button>
        <button type="button" class="button-primary" onclick="window.commitLearningAnswer('standard')" ${selectedCount ? '' : 'disabled'}>Submit answer</button>
      </div>
    </div>
  `;
}

function renderActiveSession() {
  activeQuestion = getCurrentQuestion(activeSession);
  if (!activeQuestion) {
    const completed = completeSession(activeSession);
    activeSession = completed;
    mountedContainer.innerHTML = `
      <section class="learning-study-complete" aria-live="polite">
        ${renderPlanHeader()}
        <h3>Session complete</h3>
        <p class="notes-line">${completed.summary.responseCount} responses committed across ${completed.summary.coveredObjectiveIds.length} objectives.</p>
        <button type="button" class="button-primary" onclick="window.resetLearningStudy()">Return to Study</button>
      </section>
    `;
    return;
  }

  mountedContainer.innerHTML = `
    <section class="learning-study-session" aria-labelledby="learningSessionTitle">
      ${renderPlanHeader()}
      <div id="learningSessionTitle">${renderQuestion()}</div>
      <button type="button" class="learning-pause-button" onclick="window.pauseLearningStudy()">Pause session</button>
    </section>
  `;
}

function render() {
  if (!mountedContainer) return;
  if (!activeSession) {
    renderEmptyState();
    return;
  }
  if (activeSession.status === 'paused') {
    mountedContainer.innerHTML = `
      <section class="learning-study-paused" aria-live="polite">
        ${renderPlanHeader()}
        <h3>Session paused</h3>
        <p class="notes-line">Your unanswered question and committed responses are preserved.</p>
        <button type="button" class="button-primary" onclick="window.resumeLearningStudy()">Resume session</button>
      </section>
    `;
    return;
  }
  renderActiveSession();
}

function requireMounted() {
  if (!mountedContainer) throw new Error('Learning Study UI is not mounted.');
}

window.selectLearningAnswer = (value, multiple, event) => {
  if (event?.detail === 2) {
    selectedAnswers = multiple
      ? (selectedAnswers.includes(value) ? selectedAnswers : [...selectedAnswers, value])
      : [value];
    confidence = 'certain';
    window.commitLearningAnswer('certain');
    return;
  }

  selectedAnswers = multiple
    ? selectedAnswers.includes(value)
      ? selectedAnswers.filter(answer => answer !== value)
      : [...selectedAnswers, value]
    : selectedAnswers.includes(value)
      ? []
      : [...selectedAnswers, value];
  confidence = selectedAnswers.length === 2 ? 'uncertain' : 'unconfident';
  render();
};

window.commitLearningAnswer = (requestedConfidence = 'standard') => {
  if (!activeSession || !activeQuestion || selectedAnswers.length === 0) return;
  const response = getSubmittedResponse();
  const selectedConfidence = selectedAnswers.length === 2
    ? 'uncertain'
    : confidence === 'certain'
      ? 'certain'
      : requestedConfidence === 'uncertain'
        ? 'uncertain'
        : 'standard';
  activeSession = submitResponse(activeSession, {
    question: activeQuestion,
    response,
    confidence: selectedConfidence,
    masteryBefore: Number(activeQuestion.mastery ?? 10),
    responseId: `${activeSession.sessionId}-response-${activeSession.responseEvents.length + 1}`,
  });
  selectedAnswers = [];
  confidence = 'uncertain';
  render();
};

window.pauseLearningStudy = () => {
  if (!activeSession) return;
  activeSession = pauseSession(activeSession);
  render();
};

window.resumeLearningStudy = () => {
  if (!activeSession) return;
  activeSession = resumeSession(activeSession);
  render();
};

window.resetLearningStudy = () => {
  activeSession = null;
  activeQuestion = null;
  selectedAnswers = [];
  studyContext = null;
  render();
};

window.openLearningStudySession = ({ studyPlanId, studyPlanName, queue, retrievalQueue = [], retentionQueue = [] } = {}) => {
  if (!studyPlanId) throw new Error('A studyPlanId is required to open a learning session.');
  studyContext = { studyPlanId, studyPlanName };
  activeSession = startSession(createLearningSession({
    studyPlanId,
    queue,
    retrievalQueue,
    retentionQueue,
  }));
  selectedAnswers = [];
  confidence = 'uncertain';
  requireMounted();
  render();
};

export function mountLearningStudyExperience(container) {
  mountedContainer = container;
  render();
}

window.addEventListener('DOMContentLoaded', () => {
  mountLearningStudyExperience(document.getElementById('learningStudyContainer'));
});
