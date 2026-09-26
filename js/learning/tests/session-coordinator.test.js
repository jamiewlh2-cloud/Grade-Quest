import test from 'node:test';
import assert from 'node:assert/strict';

import {
  completeSession,
  createLearningSession,
  getCurrentQuestion,
  pauseSession,
  restoreSession,
  resumeSession,
  serializeSession,
  startSession,
  submitResponse,
} from '../sessionCoordinator.js';

const question = {
  studyPlanId: 'plan-a',
  questionId: 'q-1',
  conceptId: 'concept-1',
  objectiveIds: ['objective-1'],
  correctAnswer: 'correct',
};

function makeSession() {
  return createLearningSession({
    studyPlanId: 'plan-a',
    queue: [question],
    sessionId: 'session-1',
    now: '2026-09-26T10:00:00.000Z',
  });
}

test('session coordinator keeps queue and responses scoped to one study plan', () => {
  assert.throws(() => createLearningSession({
    studyPlanId: 'plan-a',
    queue: [{ ...question, studyPlanId: 'plan-b' }],
  }), /selected study plan/);

  const started = startSession(makeSession(), { now: '2026-09-26T10:01:00.000Z' });
  assert.equal(getCurrentQuestion(started).questionId, 'q-1');
  assert.throws(() => submitResponse(started, {
    question: { ...question, studyPlanId: 'plan-b' },
    response: 'correct',
    confidence: 'standard',
  }), /session study plan/);
});

test('committed responses advance the session once and reject duplicates', () => {
  const started = startSession(makeSession());
  const answered = submitResponse(started, {
    question,
    response: 'correct',
    confidence: 'standard',
    masteryBefore: 10,
    responseId: 'response-1',
  });

  assert.equal(answered.responseEvents.length, 1);
  assert.equal(answered.responseEvents[0].studyPlanId, 'plan-a');
  assert.equal(answered.responseEvents[0].masteryAfter, 18);
  assert.throws(() => submitResponse(answered, {
    question,
    response: 'correct',
    confidence: 'standard',
    responseId: 'response-1',
  }), /already been committed/);
});

test('paused sessions serialize and resume without replaying committed responses', () => {
  const started = startSession(makeSession());
  const paused = pauseSession(started, { now: '2026-09-26T10:02:00.000Z' });
  const restored = restoreSession(serializeSession(paused), { studyPlanId: 'plan-a' });
  const resumed = resumeSession(restored, { now: '2026-09-26T10:03:00.000Z' });

  assert.equal(resumed.status, 'active');
  assert.equal(resumed.responseEvents.length, 0);
  assert.equal(getCurrentQuestion(resumed).questionId, 'q-1');
});

test('completion summarizes evidence without changing academic records', () => {
  const started = startSession(makeSession());
  const answered = submitResponse(started, {
    question,
    response: null,
    confidence: 'uncertain',
    masteryBefore: 10,
    responseId: 'response-timeout',
  });
  const completed = completeSession(answered, { now: '2026-09-26T10:04:00.000Z' });

  assert.equal(completed.status, 'completed');
  assert.equal(completed.summary.responseCount, 1);
  assert.equal(completed.summary.incorrectCount, 1);
  assert.deepEqual(completed.summary.coveredObjectiveIds, ['objective-1']);
  assert.deepEqual(completed.summary.errorQuestionIds, ['q-1']);
});

test('session advances through learning, retrieval, and retention passes', () => {
  const retrievalQuestion = { ...question, questionId: 'q-2' };
  const retentionQuestion = { ...question, questionId: 'q-3' };
  let session = createLearningSession({
    studyPlanId: 'plan-a',
    queue: [question],
    retrievalQueue: [retrievalQuestion],
    retentionQueue: [retentionQuestion],
  });

  session = startSession(session);
  session = submitResponse(session, { question, response: 'correct', confidence: 'standard' });
  assert.equal(session.currentPass, 'retrieval');
  session = submitResponse(session, { question: retrievalQuestion, response: 'correct', confidence: 'standard' });
  assert.equal(session.currentPass, 'retention');
  session = submitResponse(session, { question: retentionQuestion, response: 'correct', confidence: 'standard' });
  assert.equal(session.currentPass, 'retention');
  assert.equal(session.cursor, 1);
});
