import test from 'node:test';
import assert from 'node:assert/strict';

import { createQuestionRepository } from '../questionRepository.js';
import { createObjectiveCatalog } from '../objectiveCatalog.js';

test('question repository accepts valid records, rejects malformed ones, and resolves lookups', () => {
  const repo = createQuestionRepository();

  repo.registerQuestion({
    questionId: 'q-1',
    conceptId: 'c-1',
    studyPlanId: 'plan-1',
    courseId: 'course-1',
    objectiveIds: ['obj-1'],
    type: 'single-answer',
    prompt: 'What is 2 + 2?',
    correctAnswer: '4',
    explanation: 'Two plus two is four.',
    applicationLevel: 'direct retrieval',
    relatedQuestionIds: ['q-2'],
    sourceReference: 'Week 1',
    active: true,
  });

  assert.equal(repo.getQuestionById('q-1').questionId, 'q-1');
  assert.deepEqual(repo.getQuestionsByCourse('course-1').map(question => question.questionId), ['q-1']);
  assert.deepEqual(repo.getQuestionsByStudyPlan('plan-1').map(question => question.questionId), ['q-1']);
  assert.deepEqual(repo.getQuestionsByObjective('obj-1').map(question => question.questionId), ['q-1']);
  assert.deepEqual(repo.getQuestionsByType('single-answer').map(question => question.questionId), ['q-1']);

  assert.throws(() => repo.registerQuestion({
    questionId: 'q-1',
    conceptId: 'c-1',
    courseId: 'course-1',
    objectiveIds: ['obj-1'],
    type: 'single-answer',
    prompt: '',
    correctAnswer: '4',
    explanation: 'Two plus two is four.',
    applicationLevel: 'direct retrieval',
  }));

  assert.throws(() => repo.registerQuestion({
    questionId: 'q-2',
    conceptId: 'c-2',
    studyPlanId: 'plan-1',
    courseId: 'course-1',
    objectiveIds: [],
    type: 'single-answer',
    prompt: 'Question missing objective link.',
    correctAnswer: '4',
    explanation: 'No objective link.',
    applicationLevel: 'direct retrieval',
  }));
});

test('question repository deactivation preserves history and excludes inactive records from scheduling', () => {
  const repo = createQuestionRepository([
    {
      questionId: 'q-3',
      conceptId: 'c-3',
      studyPlanId: 'plan-2',
      courseId: 'course-2',
      objectiveIds: ['obj-2'],
      type: 'multiple-answer',
      prompt: 'Which options are valid?',
      correctAnswer: ['A', 'C'],
      explanation: 'Only A and C are valid.',
      applicationLevel: 'comparison',
      sourceReference: 'Week 3',
      active: true,
    },
    {
      questionId: 'q-4',
      conceptId: 'c-4',
      studyPlanId: 'plan-2',
      courseId: 'course-2',
      objectiveIds: ['obj-2'],
      type: 'multiple-answer',
      prompt: 'Another question.',
      correctAnswer: ['B'],
      explanation: 'Only B is valid.',
      applicationLevel: 'application',
      sourceReference: 'Week 3',
      active: true,
    },
  ]);

  assert.equal(repo.getSchedulableQuestions().length, 2);

  repo.deactivateQuestion('q-3');

  assert.equal(repo.getQuestionById('q-3').active, false);
  assert.deepEqual(repo.getSchedulableQuestions().map(question => question.questionId), ['q-4']);
  assert.deepEqual(repo.getAllQuestionIds(), ['q-3', 'q-4']);
});

test('objective catalog validates and preserves objective history when deactivated', () => {
  const catalog = createObjectiveCatalog();

  catalog.registerObjective({
    objectiveId: 'obj-1',
    studyPlanId: 'plan-1',
    courseId: 'course-1',
    title: 'Basic arithmetic',
    description: 'Learn arithmetic fundamentals.',
    importance: 5,
    questionIds: ['q-1', 'q-2'],
    active: true,
  });

  assert.equal(catalog.getObjectiveById('obj-1').title, 'Basic arithmetic');
  assert.deepEqual(catalog.getObjectivesByCourse('course-1').map(objective => objective.objectiveId), ['obj-1']);
  assert.deepEqual(catalog.getObjectivesByStudyPlan('plan-1').map(objective => objective.objectiveId), ['obj-1']);
  assert.deepEqual(catalog.getQuestionIdsForObjective('obj-1'), ['q-1', 'q-2']);

  catalog.deactivateObjective('obj-1');

  assert.equal(catalog.getObjectiveById('obj-1').active, false);
  assert.deepEqual(catalog.getAllObjectiveIds(), ['obj-1']);

  assert.throws(() => catalog.registerObjective({
    objectiveId: 'obj-1',
    studyPlanId: 'plan-1',
    courseId: 'course-1',
    title: '',
    importance: 3,
  }));
});
