export const INITIAL_MASTERY = 10;
export const MIN_MASTERY = 0;
export const MAX_MASTERY = 100;

export const CONFIDENCE_LEVELS = ['uncertain', 'standard', 'certain'];
export const MASTERY_BANDS = [
  { key: 'unfamiliar', min: 0, max: 29 },
  { key: 'developing', min: 30, max: 59 },
  { key: 'functional', min: 60, max: 79 },
  { key: 'strong', min: 80, max: 94 },
  { key: 'maintained', min: 95, max: 100 },
];

const MASTERY_RULES = {
  uncertain: { correct: 4, incorrect: -8 },
  standard: { correct: 8, incorrect: -10 },
  certain: { correct: 12, incorrect: -18 },
};

export function normalizeConfidence(confidence) {
  const normalized = String(confidence || '').toLowerCase();
  if (!CONFIDENCE_LEVELS.includes(normalized)) {
    throw new Error(`Unsupported confidence level: ${confidence}`);
  }
  return normalized;
}

export function normalizeQuestion(question) {
  if (!question || typeof question !== 'object') {
    throw new Error('Question payload is required.');
  }

  if (!question.studyPlanId) {
    throw new Error('Question must include a studyPlanId.');
  }

  if (!question.questionId || !question.conceptId || !question.type || !question.prompt || !question.correctAnswer || !question.explanation || !question.applicationLevel) {
    throw new Error('Question is missing required fields.');
  }

  if (!Array.isArray(question.objectiveIds) || question.objectiveIds.length === 0) {
    throw new Error('Question must include at least one objective id.');
  }

  const normalized = {
    ...question,
    objectiveIds: [...question.objectiveIds],
    relatedQuestionIds: Array.isArray(question.relatedQuestionIds) ? [...question.relatedQuestionIds] : [],
    active: question.active !== false,
    mastery: typeof question.mastery === 'number' ? question.mastery : INITIAL_MASTERY,
  };

  if (typeof normalized.bookmark === 'undefined') {
    normalized.bookmark = '';
  }

  return normalized;
}

export function calculateMasteryDelta({ correct, confidence, masteryBefore }) {
  const normalizedConfidence = normalizeConfidence(confidence);
  const base = Number.isFinite(masteryBefore) ? masteryBefore : INITIAL_MASTERY;
  const deltaConfig = MASTERY_RULES[normalizedConfidence];

  let delta = correct === true ? deltaConfig.correct : correct === false ? deltaConfig.incorrect : -12;

  if (correct === true && base >= 80 && delta > 0) {
    delta = Math.min(delta, 5);
  }

  if (correct === false && base <= 20 && delta < 0) {
    delta = Math.max(delta, -12);
  }

  return delta;
}

export function getMasteryBand(masteryValue) {
  const value = Number.isFinite(masteryValue) ? Math.min(Math.max(masteryValue, MIN_MASTERY), MAX_MASTERY) : MIN_MASTERY;

  const band = MASTERY_BANDS.find(candidate => value >= candidate.min && value <= candidate.max);
  return band ? band.key : 'unfamiliar';
}

export function normalizeResponse(response) {
  if (!response || typeof response !== 'object') {
    throw new Error('Response payload is required.');
  }

  if (!response.studyPlanId) {
    throw new Error('Response must include a studyPlanId.');
  }

  const confidence = normalizeConfidence(response.confidence);
  const normalized = {
    ...response,
    confidence,
    outcome: response.outcome || (response.correct === true ? 'correct' : response.correct === false ? 'incorrect' : 'timeout'),
    calibrationResult: response.correct === true && confidence === 'certain' ? 'calibrated' : response.correct === true && confidence === 'standard' ? 'calibrated' : response.correct === false && confidence === 'certain' ? 'overconfident' : response.correct === true && confidence === 'uncertain' ? 'underconfident' : 'appropriately cautious',
    response: response.response ?? [],
  };

  return normalized;
}

export function sortBySchedulePriority(items) {
  return [...items].sort((a, b) => {
    const dueDiff = (new Date(a.dueAt || 0).getTime() || 0) - (new Date(b.dueAt || 0).getTime() || 0);
    if (dueDiff !== 0) return dueDiff;

    const masteryDiff = (a.mastery ?? INITIAL_MASTERY) - (b.mastery ?? INITIAL_MASTERY);
    if (masteryDiff !== 0) return masteryDiff;

    return String(a.questionId || '').localeCompare(String(b.questionId || ''));
  });
}
