import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateResponse } from '../responseEvaluator.js';

test('response evaluation preserves study-plan ownership and reproduces deterministic mastery shifts', () => {
  const event = evaluateResponse({
    studyPlanId: 'plan-1',
    response: '4',
    correctAnswer: '4',
    confidence: 'standard',
    masteryBefore: 10,
    wasDue: true,
    wasOverdue: false,
    delayDays: 0,
    previousIncorrectCount: 1,
    previousCertainIncorrectCount: 0,
  });

  assert.equal(event.studyPlanId, 'plan-1');
  assert.equal(event.outcome, 'correct');
  assert.equal(event.masteryDelta, 8);
  assert.equal(event.masteryAfter, 18);
  assert.equal(event.calibrationResult, 'calibrated');
  assert.equal(event.delayedBonus, 0);
});

test('certain incorrect responses produce stronger correction and overconfidence signals', () => {
  const event = evaluateResponse({
    studyPlanId: 'plan-2',
    response: ['A', 'C'],
    correctAnswer: ['A', 'B'],
    confidence: 'certain',
    masteryBefore: 55,
    wasDue: true,
    wasOverdue: false,
    delayDays: 0,
    previousIncorrectCount: 2,
    previousCertainIncorrectCount: 1,
  });

  assert.equal(event.outcome, 'incorrect');
  assert.equal(event.masteryDelta, -18);
  assert.equal(event.calibrationResult, 'overconfident');
  assert.equal(event.overconfidenceFlag, true);
});

test('multiple-answer responses require exact matching and timeout responses are handled deterministically', () => {
  const exact = evaluateResponse({
    studyPlanId: 'plan-2',
    response: ['A', 'C'],
    correctAnswer: ['A', 'C'],
    confidence: 'uncertain',
    masteryBefore: 40,
    wasDue: false,
    wasOverdue: false,
    delayDays: 0,
    previousIncorrectCount: 0,
    previousCertainIncorrectCount: 0,
  });

  const timeout = evaluateResponse({
    studyPlanId: 'plan-2',
    response: null,
    correctAnswer: '4',
    confidence: 'standard',
    masteryBefore: 50,
    wasDue: true,
    wasOverdue: false,
    delayDays: 0,
    previousIncorrectCount: 2,
    previousCertainIncorrectCount: 1,
  });

  assert.equal(exact.outcome, 'correct');
  assert.equal(exact.masteryDelta, 4);
  assert.equal(timeout.outcome, 'timeout');
  assert.equal(timeout.masteryDelta, -12);
  assert.equal(timeout.recoveryState, 'explanation-needed');
});
