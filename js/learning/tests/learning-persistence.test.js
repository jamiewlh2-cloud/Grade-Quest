import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LEARNING_SCHEMA_VERSION,
  createEmptyLearningState,
  loadLearningState,
  normalizeLearningState,
  saveLearningState,
  validateLearningState,
} from '../learningPersistence.js';

function plan(studyPlanId = 'plan-a', courseId = 'course-a') {
  return {
    studyPlanId,
    courseId,
    name: 'Midterm Review',
    createdAt: '2026-09-26T00:00:00.000Z',
    updatedAt: '2026-09-26T00:00:00.000Z',
  };
}

test('empty learning state is versioned and has independent plan-owned collections', () => {
  const state = createEmptyLearningState();
  assert.equal(state.schemaVersion, LEARNING_SCHEMA_VERSION);
  assert.deepEqual(state.plans, []);
  assert.deepEqual(state.sessions, []);
  assert.deepEqual(normalizeLearningState(null), state);
});

test('valid learning state preserves sibling StudyPlan boundaries', () => {
  const state = createEmptyLearningState();
  state.plans = [plan('plan-a', 'course-a'), plan('plan-b', 'course-a')];
  state.questions = [
    { studyPlanId: 'plan-a', questionId: 'q-a' },
    { studyPlanId: 'plan-b', questionId: 'q-b' },
  ];
  state.sessions = [{ studyPlanId: 'plan-a', sessionId: 'session-a' }];

  const validated = validateLearningState(state);
  assert.deepEqual(validated.plans.map(item => item.studyPlanId), ['plan-a', 'plan-b']);
  assert.equal(validated.questions[1].studyPlanId, 'plan-b');
});

test('invalid or cross-course learning records are rejected without implicit plans', () => {
  const state = createEmptyLearningState();
  state.plans = [plan('plan-a', 'course-a')];
  state.questions = [{ studyPlanId: 'missing-plan', questionId: 'q-1' }];
  assert.throws(() => validateLearningState(state), /unknown StudyPlan/);

  state.questions = [{ studyPlanId: 'plan-a', courseId: 'course-b', questionId: 'q-2' }];
  assert.throws(() => validateLearningState(state), /cross-course/);
});

test('unsupported schema versions are rejected for migration safety', () => {
  const state = createEmptyLearningState();
  state.schemaVersion = 99;
  assert.throws(() => validateLearningState(state), /Unsupported learning schema version/);
});

test('storage adapter saves validated payloads and isolates malformed local data', () => {
  let stored = null;
  const storage = {
    getJson: () => stored,
    setJson: (key, value) => { stored = value; },
  };
  const state = createEmptyLearningState();

  saveLearningState(storage, state);
  assert.equal(stored.schemaVersion, LEARNING_SCHEMA_VERSION);
  assert.deepEqual(loadLearningState(storage), state);

  stored = { schemaVersion: 99 };
  assert.deepEqual(loadLearningState(storage), createEmptyLearningState());
});
