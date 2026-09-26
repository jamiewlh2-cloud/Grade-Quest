import test from 'node:test';
import assert from 'node:assert/strict';

import {
  INITIAL_MASTERY,
  MAX_MASTERY,
  MIN_MASTERY,
  calculateMasteryDelta,
  getMasteryBand,
  normalizeConfidence,
  normalizeQuestion,
  normalizeResponse,
  sortBySchedulePriority,
} from '../schema.js';

test('valid questions normalize with stable defaults', () => {
  const question = normalizeQuestion({
    questionId: 'q-1',
    conceptId: 'c-1',
    courseId: 'course-1',
    objectiveIds: ['obj-1'],
    type: 'single-answer',
    prompt: 'What is 2 + 2?',
    correctAnswer: '4',
    explanation: 'Addition yields four.',
    applicationLevel: 'direct retrieval',
    relatedQuestionIds: ['q-2'],
    sourceReference: 'Week 1 notes',
    active: true,
  });

  assert.equal(question.questionId, 'q-1');
  assert.equal(question.mastery, INITIAL_MASTERY);
  assert.equal(question.active, true);
  assert.deepEqual(question.objectiveIds, ['obj-1']);
});

test('invalid question payloads are rejected', () => {
  assert.throws(() => normalizeQuestion({
    questionId: 'q-1',
    conceptId: 'c-1',
    objectiveIds: [],
    type: 'single-answer',
    prompt: '',
    correctAnswer: undefined,
    explanation: '',
    applicationLevel: 'direct retrieval',
  }));
});

test('confidence values normalize to the supported contract', () => {
  assert.equal(normalizeConfidence('certain'), 'certain');
  assert.equal(normalizeConfidence('standard'), 'standard');
  assert.equal(normalizeConfidence('uncertain'), 'uncertain');
  assert.throws(() => normalizeConfidence('very-high'));
});

test('mastery deltas follow the deterministic design document values', () => {
  assert.equal(calculateMasteryDelta({ correct: true, confidence: 'uncertain', masteryBefore: 10 }), 4);
  assert.equal(calculateMasteryDelta({ correct: true, confidence: 'standard', masteryBefore: 10 }), 8);
  assert.equal(calculateMasteryDelta({ correct: true, confidence: 'certain', masteryBefore: 10 }), 12);
  assert.equal(calculateMasteryDelta({ correct: false, confidence: 'uncertain', masteryBefore: 50 }), -8);
  assert.equal(calculateMasteryDelta({ correct: false, confidence: 'standard', masteryBefore: 50 }), -10);
  assert.equal(calculateMasteryDelta({ correct: false, confidence: 'certain', masteryBefore: 50 }), -18);
  assert.equal(calculateMasteryDelta({ correct: null, confidence: 'standard', masteryBefore: 50 }), -12);
});

test('mastery is bounded and mapped to the required bands', () => {
  assert.equal(calculateMasteryDelta({ correct: true, confidence: 'certain', masteryBefore: 95 }), 5);
  assert.equal(calculateMasteryDelta({ correct: false, confidence: 'certain', masteryBefore: 5 }), -12);
  assert.equal(getMasteryBand(-5), 'unfamiliar');
  assert.equal(getMasteryBand(0), 'unfamiliar');
  assert.equal(getMasteryBand(30), 'developing');
  assert.equal(getMasteryBand(60), 'functional');
  assert.equal(getMasteryBand(80), 'strong');
  assert.equal(getMasteryBand(95), 'maintained');
  assert.equal(getMasteryBand(200), 'maintained');
  assert.equal(getMasteryBand(MIN_MASTERY), 'unfamiliar');
  assert.equal(getMasteryBand(MAX_MASTERY), 'maintained');
});

test('response normalization preserves commitment-time evidence and supports multi-answer contracts', () => {
  const response = normalizeResponse({
    responseId: 'r-1',
    sessionId: 's-1',
    questionId: 'q-1',
    conceptId: 'c-1',
    objectiveIds: ['obj-1'],
    response: ['A', 'C'],
    confidence: 'certain',
    correct: false,
    outcome: 'incorrect',
    wasDue: true,
    wasOverdue: false,
    delayDays: 0,
    confidenceCapturedAt: '2026-09-26T12:00:00.000Z',
    committedAt: '2026-09-26T12:01:00.000Z',
    presentedAt: '2026-09-26T12:00:00.000Z',
  });

  assert.equal(response.responseId, 'r-1');
  assert.deepEqual(response.response, ['A', 'C']);
  assert.equal(response.confidence, 'certain');
  assert.equal(response.outcome, 'incorrect');
  assert.equal(response.calibrationResult, 'overconfident');
});

test('schedule sorting stays deterministic with stable tie-breaking', () => {
  const items = [
    { questionId: 'q-3', dueAt: '2026-09-30T00:00:00.000Z', mastery: 75, coverageScore: 1 },
    { questionId: 'q-1', dueAt: '2026-09-26T00:00:00.000Z', mastery: 35, coverageScore: 0 },
    { questionId: 'q-2', dueAt: '2026-09-26T00:00:00.000Z', mastery: 35, coverageScore: 0 },
  ];

  const sorted = sortBySchedulePriority(items);
  assert.deepEqual(sorted.map(item => item.questionId), ['q-1', 'q-2', 'q-3']);
});
