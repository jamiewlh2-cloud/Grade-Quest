import test from 'node:test';
import assert from 'node:assert/strict';

import { generateQuestionProposals } from '../questionGenerator.js';
import { createQuestionRepository } from '../questionRepository.js';

const studyPlans = [
  { studyPlanId: 'plan-a', courseId: 'course-a', name: 'Midterm Review' },
];

function extractedDocument(paragraphs) {
  return { text: paragraphs.map(paragraph => paragraph.text).join('\n'), paragraphs };
}

test('explicit term-definition paragraphs produce deterministic, source-addressable proposals', () => {
  const document = extractedDocument([
    {
      index: 4,
      pageNumber: 2,
      lineIndex: 6,
      text: 'Osmosis: movement of water across a selectively permeable membrane.',
      sourceText: 'Osmosis: movement of water across a selectively permeable membrane.',
    },
  ]);
  const input = {
    document,
    studyPlanId: 'plan-a',
    studyPlans,
    sourceId: 'resource-1',
    sourceCourseId: 'course-a',
  };

  const first = generateQuestionProposals(input);
  const second = generateQuestionProposals(input);

  assert.deepEqual(first, second);
  assert.equal(first.proposals.length, 1);
  assert.equal(first.proposals[0].studyPlanId, 'plan-a');
  assert.equal(first.proposals[0].status, 'pending-review');
  assert.equal(first.proposals[0].candidate.answer, 'movement of water across a selectively permeable membrane.');
  assert.deepEqual(first.proposals[0].sourceReference, {
    sourceId: 'resource-1',
    courseId: 'course-a',
    paragraphIndex: 4,
    pageNumber: 2,
    lineIndex: 6,
    excerpt: 'Osmosis: movement of water across a selectively permeable membrane.',
  });
  assert.equal(first.diagnostics.proposedCount, 1);
});

test('unstructured or ambiguous prose is skipped rather than turned into questions', () => {
  const result = generateQuestionProposals({
    document: extractedDocument([
      { index: 0, text: 'The process can vary depending on the conditions.' },
      { index: 1, text: 'Why does the process occur?' },
      { index: 2, text: 'Heading: short' },
    ]),
    studyPlanId: 'plan-a',
    studyPlans,
    sourceId: 'resource-1',
  });

  assert.deepEqual(result.proposals, []);
  assert.equal(result.diagnostics.skippedCount, 3);
});

test('generation rejects missing, unknown, and cross-course StudyPlan context', () => {
  const input = {
    document: extractedDocument([]),
    studyPlans,
    sourceId: 'resource-1',
  };

  assert.throws(() => generateQuestionProposals({ ...input }), /studyPlanId is required/);
  assert.throws(() => generateQuestionProposals({ ...input, studyPlanId: 'missing-plan' }), /must exist/);
  assert.throws(() => generateQuestionProposals({
    ...input,
    studyPlanId: 'plan-a',
    sourceCourseId: 'course-b',
  }), /does not match/);
});

test('pending proposals never register in or change the active question repository', () => {
  const repository = createQuestionRepository();
  const beforeIds = repository.getAllQuestionIds();
  const beforeSchedulable = repository.getSchedulableQuestions();

  const result = generateQuestionProposals({
    document: extractedDocument([
      { index: 0, pageNumber: 1, lineIndex: 0, text: 'Mitosis: division of a cell into two genetically identical daughter cells.' },
    ]),
    studyPlanId: 'plan-a',
    studyPlans,
    sourceId: 'resource-1',
  });

  assert.equal(result.proposals.length, 1);
  assert.deepEqual(repository.getAllQuestionIds(), beforeIds);
  assert.deepEqual(repository.getSchedulableQuestions(), beforeSchedulable);
  assert.deepEqual(repository.getQuestionsByStudyPlan('plan-a'), []);
});

test('proposal limit remains bounded and proposal records are not active catalog records', () => {
  const paragraphs = Array.from({ length: 25 }, (_, index) => ({
    index,
    text: `Term ${index}: a sufficiently detailed definition for item ${index}.`,
  }));
  const result = generateQuestionProposals({
    document: extractedDocument(paragraphs),
    studyPlanId: 'plan-a',
    studyPlans,
    sourceId: 'resource-1',
    maxProposals: 3,
  });

  assert.equal(result.proposals.length, 3);
  assert.equal(result.diagnostics.skippedCount, 22);
  assert.equal('questionId' in result.proposals[0], false);
  assert.equal('active' in result.proposals[0], false);
  assert.equal('mastery' in result.proposals[0], false);
});