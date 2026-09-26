export function createReviewEntry({
  studyPlanId,
  questionId,
  conceptId,
  objectiveIds,
  dueAt,
  reason,
  mastery,
  currentIntervalDays = 1,
  retrievalOutcome,
  confidence,
  wasDue,
  wasOverdue,
}) {
  if (!studyPlanId) {
    throw new Error('A studyPlanId is required for a review entry.');
  }

  const priorityInputs = {
    need: Math.max(0, 100 - Number(mastery || 10)),
    urgency: wasOverdue ? 40 : wasDue ? 20 : 0,
    risk: retrievalOutcome === 'incorrect' ? (wasOverdue ? 60 : 30) : (wasOverdue ? 20 : 0),
    coverage: 0,
  };

  return {
    studyPlanId,
    questionId,
    conceptId,
    objectiveIds: Array.isArray(objectiveIds) ? [...objectiveIds] : [],
    dueAt,
    reason: reason || getReviewReason({ mastery, recentErrors: retrievalOutcome === 'incorrect' ? 1 : 0, wasOverdue }),
    priorityInputs,
    intervalDays: getReviewInterval({ mastery, confidence, retrievalOutcome, currentIntervalDays }),
    wasDue,
    wasOverdue,
  };
}

export function getReviewReason({ mastery, recentErrors = 0, wasOverdue = false }) {
  if (wasOverdue) return 'overdue';
  if (Number(mastery) < 60) return 'weak';
  if (recentErrors > 1) return 'repeated error';
  return 'due';
}

export function getReviewInterval({ mastery, confidence, retrievalOutcome, currentIntervalDays = 1 }) {
  const base = Number(currentIntervalDays || 1);
  const masteryValue = Number(mastery || 10);

  if (retrievalOutcome === 'incorrect') {
    return Math.max(1, Math.round(base / 2));
  }

  if (confidence === 'certain' && masteryValue >= 80) {
    return Math.max(7, base * 2);
  }

  if (confidence === 'uncertain') {
    return Math.max(1, base);
  }

  return Math.max(1, Math.min(30, base + 2));
}
