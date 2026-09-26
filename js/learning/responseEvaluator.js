import { calculateMasteryDelta, normalizeConfidence } from './schema.js';

function normalizeMultipleAnswerResponse(response) {
  if (response === null || typeof response === 'undefined') {
    return null;
  }

  if (Array.isArray(response)) {
    return [...response].map(item => String(item));
  }

  return [String(response)];
}

export function evaluateResponse({
  studyPlanId,
  response,
  correctAnswer,
  confidence,
  masteryBefore,
  wasDue,
  wasOverdue,
  delayDays = 0,
  previousIncorrectCount = 0,
  previousCertainIncorrectCount = 0,
  correct = null,
}) {
  const normalizedConfidence = normalizeConfidence(confidence);

  if (!studyPlanId) {
    throw new Error('A studyPlanId is required for learning responses.');
  }

  const hasAnswer = response !== null && typeof response !== 'undefined';
  const correctness = typeof correct === 'boolean'
    ? correct
    : hasAnswer
      ? Array.isArray(correctAnswer)
        ? JSON.stringify(normalizeMultipleAnswerResponse(response).sort()) === JSON.stringify(normalizeMultipleAnswerResponse(correctAnswer).sort())
        : String(response) === String(correctAnswer)
      : null;

  const outcome = correctness === true ? 'correct' : correctness === false ? 'incorrect' : 'timeout';

  const masteryDelta = calculateMasteryDelta({
    correct: correctness,
    confidence: normalizedConfidence,
    masteryBefore,
  });

  const masteryAfter = Math.max(0, Math.min(100, Number(masteryBefore || 0) + masteryDelta));
  const delayedBonus = correctness === true && (delayDays > 0) ? Math.min(4, Math.max(0, delayDays / 7)) : 0;

  let calibrationResult = 'appropriately cautious';
  if (correctness === true && normalizedConfidence === 'certain') {
    calibrationResult = 'calibrated';
  } else if (correctness === true && normalizedConfidence === 'standard') {
    calibrationResult = 'calibrated';
  } else if (correctness === false && normalizedConfidence === 'certain') {
    calibrationResult = 'overconfident';
  } else if (correctness === true && normalizedConfidence === 'uncertain') {
    calibrationResult = 'underconfident';
  }

  let overconfidenceFlag = false;
  if (correctness === false && normalizedConfidence === 'certain') {
    overconfidenceFlag = true;
  }

  let recoveryState = 'none';
  if (correctness !== true || previousIncorrectCount > 0 || previousCertainIncorrectCount > 0) {
    recoveryState = 'explanation-needed';
  }

  return {
    studyPlanId,
    response,
    correct: correctness,
    outcome,
    confidence: normalizedConfidence,
    masteryDelta,
    masteryAfter: masteryAfter + (correctness === true ? Math.round(delayedBonus) : 0),
    delayedBonus: Number(delayedBonus.toFixed(2)),
    calibrationResult,
    overconfidenceFlag,
    recoveryState,
    wasDue,
    wasOverdue,
    delayDays,
    previousIncorrectCount,
    previousCertainIncorrectCount,
  };
}
