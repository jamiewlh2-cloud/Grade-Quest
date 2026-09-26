import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDeterministicQueue, scoreSchedulingPriority } from '../scheduler.js';
import { createReviewEntry, getReviewInterval, getReviewReason } from '../reviewPlanner.js';

test('scheduler stays within a single study plan and resolves ties deterministically', () => {
  const items = [
    { studyPlanId: 'plan-b', questionId: 'q-2', mastery: 18, dueAt: '2026-09-28T00:00:00.000Z', recentErrors: 0, overdueDays: 0, overconfidenceFlag: false, coverageScore: 0 },
    { studyPlanId: 'plan-a', questionId: 'q-1', mastery: 25, dueAt: '2026-09-27T00:00:00.000Z', recentErrors: 0, overdueDays: 0, overconfidenceFlag: false, coverageScore: 0 },
    { studyPlanId: 'plan-a', questionId: 'q-3', mastery: 25, dueAt: '2026-09-27T00:00:00.000Z', recentErrors: 0, overdueDays: 0, overconfidenceFlag: false, coverageScore: 0 },
    { studyPlanId: 'plan-a', questionId: 'q-4', mastery: 75, dueAt: '2026-09-30T00:00:00.000Z', recentErrors: 0, overdueDays: 0, overconfidenceFlag: false, coverageScore: 0 },
  ];

  const queue = buildDeterministicQueue(items, { studyPlanId: 'plan-a' });
  assert.deepEqual(queue.map(item => item.questionId), ['q-1', 'q-3', 'q-4']);
  assert.equal(scoreSchedulingPriority(items[0]).total, scoreSchedulingPriority(items[0]).total);
});

test('review planner assigns due and overdue logic and keeps next-review interval deterministic', () => {
  const dueEntry = createReviewEntry({
    studyPlanId: 'plan-a',
    questionId: 'q-1',
    conceptId: 'c-1',
    objectiveIds: ['obj-1'],
    dueAt: '2026-09-26T00:00:00.000Z',
    reason: 'due',
    mastery: 45,
    currentIntervalDays: 7,
    retrievalOutcome: 'correct',
    confidence: 'standard',
    wasDue: true,
    wasOverdue: false,
  });

  const overdueEntry = createReviewEntry({
    studyPlanId: 'plan-a',
    questionId: 'q-2',
    conceptId: 'c-2',
    objectiveIds: ['obj-2'],
    dueAt: '2026-09-20T00:00:00.000Z',
    reason: 'overdue',
    mastery: 62,
    currentIntervalDays: 7,
    retrievalOutcome: 'incorrect',
    confidence: 'certain',
    wasDue: false,
    wasOverdue: true,
  });

  assert.equal(dueEntry.studyPlanId, 'plan-a');
  assert.equal(getReviewReason({ mastery: 55, recentErrors: 2, wasOverdue: true }), 'overdue');
  assert.equal(getReviewInterval({ mastery: 80, confidence: 'certain', retrievalOutcome: 'correct', currentIntervalDays: 7 }), 14);
  assert.equal(overdueEntry.priorityInputs.risk > overdueEntry.priorityInputs.need, true);
});
