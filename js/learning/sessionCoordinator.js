import { evaluateResponse } from './responseEvaluator.js';

const PASSES = ['learning', 'retrieval', 'retention'];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertPlan(studyPlanId) {
  if (!studyPlanId) {
    throw new Error('A studyPlanId is required for a learning session.');
  }
}

function assertSessionPlan(session, studyPlanId) {
  assertPlan(studyPlanId);
  if (session.studyPlanId !== studyPlanId) {
    throw new Error('Session studyPlanId does not match the selected plan.');
  }
}

function validateQueue(queue, studyPlanId) {
  if (!Array.isArray(queue)) {
    throw new Error('A session queue is required.');
  }

  if (queue.some(item => !item || item.studyPlanId !== studyPlanId)) {
    throw new Error('All session queue items must belong to the selected study plan.');
  }
}

function makePassQueues(queue, retrievalQueue, retentionQueue) {
  return {
    learning: [...queue],
    retrieval: [...retrievalQueue],
    retention: [...retentionQueue],
  };
}

function currentQueue(session) {
  return session.passQueues[session.currentPass] || [];
}

function currentItem(session) {
  return currentQueue(session)[session.cursor] || null;
}

function withStatus(session, status) {
  return { ...session, status };
}

export function createLearningSession({
  studyPlanId,
  queue,
  retrievalQueue = [],
  retentionQueue = [],
  sessionId = `session-${Date.now()}`,
  now = new Date().toISOString(),
}) {
  assertPlan(studyPlanId);
  validateQueue(queue, studyPlanId);
  validateQueue(retrievalQueue, studyPlanId);
  validateQueue(retentionQueue, studyPlanId);

  return {
    sessionId,
    studyPlanId,
    status: 'planned',
    currentPass: 'learning',
    cursor: 0,
    passQueues: makePassQueues(queue, retrievalQueue, retentionQueue),
    committedResponseIds: [],
    responseEvents: [],
    coveredObjectiveIds: [],
    recoveryQueue: [],
    errorQuestionIds: [],
    uncertainQuestionIds: [],
    startedAt: null,
    pausedAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    summary: null,
  };
}

export function startSession(session, { now = new Date().toISOString() } = {}) {
  if (session.status !== 'planned' && session.status !== 'paused') {
    throw new Error(`Cannot start a ${session.status} session.`);
  }

  return {
    ...clone(session),
    status: 'active',
    startedAt: session.startedAt || now,
    pausedAt: null,
    updatedAt: now,
  };
}

export function getCurrentQuestion(session) {
  if (session.status !== 'active') return null;
  return currentItem(session);
}

function advancePass(session) {
  let next = session;
  let passIndex = PASSES.indexOf(next.currentPass);

  while (passIndex < PASSES.length - 1 && next.cursor >= currentQueue(next).length) {
    const nextPass = PASSES[passIndex + 1];
    next = { ...next, currentPass: nextPass, cursor: 0 };
    passIndex += 1;
  }

  return next;
}

function appendUnique(items, value) {
  return items.includes(value) ? items : [...items, value];
}

export function submitResponse(session, {
  question,
  response,
  confidence,
  masteryBefore,
  responseId = `response-${session.responseEvents.length + 1}`,
  wasDue = false,
  wasOverdue = false,
  delayDays = 0,
  previousIncorrectCount = 0,
  previousCertainIncorrectCount = 0,
  now = new Date().toISOString(),
} = {}) {
  if (session.status !== 'active') {
    throw new Error('Only active sessions can accept responses.');
  }

  if (!question || question.studyPlanId !== session.studyPlanId) {
    throw new Error('Response question must belong to the session study plan.');
  }

  if (session.committedResponseIds.includes(responseId)) {
    throw new Error(`Response ${responseId} has already been committed.`);
  }

  const activeQuestion = currentItem(session);
  if (!activeQuestion || activeQuestion.questionId !== question.questionId) {
    throw new Error('Response question is not the current session question.');
  }

  const event = evaluateResponse({
    studyPlanId: session.studyPlanId,
    response,
    correctAnswer: question.correctAnswer,
    confidence,
    masteryBefore,
    wasDue,
    wasOverdue,
    delayDays,
    previousIncorrectCount,
    previousCertainIncorrectCount,
  });

  const next = clone(session);
  next.responseEvents.push({
    ...event,
    responseId,
    sessionId: session.sessionId,
    questionId: question.questionId,
    conceptId: question.conceptId,
    objectiveIds: [...(question.objectiveIds || [])],
    committedAt: now,
    pass: session.currentPass,
  });
  next.committedResponseIds.push(responseId);
  next.cursor += 1;
  next.updatedAt = now;

  for (const objectiveId of question.objectiveIds || []) {
    next.coveredObjectiveIds = appendUnique(next.coveredObjectiveIds, objectiveId);
  }

  if (event.outcome !== 'correct') {
    next.errorQuestionIds = appendUnique(next.errorQuestionIds, question.questionId);
    next.recoveryQueue = appendUnique(next.recoveryQueue, question.questionId);
  }
  if (confidence === 'uncertain') {
    next.uncertainQuestionIds = appendUnique(next.uncertainQuestionIds, question.questionId);
  }

  if (next.cursor >= currentQueue(next).length) {
    return advancePass(next);
  }

  return next;
}

export function pauseSession(session, { now = new Date().toISOString() } = {}) {
  if (session.status !== 'active') {
    throw new Error('Only active sessions can be paused.');
  }

  return { ...clone(session), status: 'paused', pausedAt: now, updatedAt: now };
}

export function resumeSession(session, { now = new Date().toISOString() } = {}) {
  if (session.status !== 'paused') {
    throw new Error('Only paused sessions can be resumed.');
  }

  return { ...clone(session), status: 'active', pausedAt: null, updatedAt: now };
}

export function completeSession(session, { now = new Date().toISOString() } = {}) {
  if (session.status !== 'active') {
    throw new Error('Only active sessions can be completed.');
  }

  if (session.cursor < currentQueue(session).length) {
    throw new Error('Cannot complete a session with unanswered questions.');
  }

  const completed = clone(session);
  completed.status = 'completed';
  completed.completedAt = now;
  completed.updatedAt = now;
  completed.summary = {
    responseCount: completed.responseEvents.length,
    correctCount: completed.responseEvents.filter(event => event.outcome === 'correct').length,
    incorrectCount: completed.responseEvents.filter(event => event.outcome !== 'correct').length,
    coveredObjectiveIds: [...completed.coveredObjectiveIds],
    errorQuestionIds: [...completed.errorQuestionIds],
    uncertainQuestionIds: [...completed.uncertainQuestionIds],
    recoveryQuestionIds: [...completed.recoveryQueue],
    nextPass: completed.currentPass,
  };
  return completed;
}

export function serializeSession(session) {
  return JSON.stringify(session);
}

export function restoreSession(serialized, { studyPlanId } = {}) {
  assertPlan(studyPlanId);
  const session = typeof serialized === 'string' ? JSON.parse(serialized) : clone(serialized);
  assertSessionPlan(session, studyPlanId);
  validateQueue(session.passQueues?.learning, studyPlanId);
  validateQueue(session.passQueues?.retrieval || [], studyPlanId);
  validateQueue(session.passQueues?.retention || [], studyPlanId);
  return session;
}

export function getSessionProgress(session) {
  const total = currentQueue(session).length;
  return {
    pass: session.currentPass,
    position: Math.min(session.cursor, total),
    total,
    completed: session.status === 'completed',
  };
}
