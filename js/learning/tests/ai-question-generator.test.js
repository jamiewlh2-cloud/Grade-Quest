import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildQuestionGenerationPrompt,
  createQuestionGenerationRequest,
  generateOllamaQuestionProposals,
  mapQuestionGenerationResponse,
} from '../aiQuestionGenerator.js';
import { createQuestionRepository } from '../questionRepository.js';

const studyPlans = [{ studyPlanId: 'plan-a', courseId: 'course-a', name: 'Midterm Review' }];
const paragraphs = [{
  index: 12,
  pageNumber: 3,
  lineIndex: 5,
  text: 'Osmosis is the movement of water across a selectively permeable membrane.',
}];

test('packages selected extracted blocks without unrelated application state', () => {
  const request = createQuestionGenerationRequest({
    paragraphs,
    sourceId: 'upload-1',
    studyPlanId: 'plan-a',
    studyPlans,
  });
  const prompt = buildQuestionGenerationPrompt(request);

  assert.match(prompt, /Osmosis/);
  assert.match(prompt, /no web browsing, internet search, external retrieval/i);
  assert.doesNotMatch(prompt, /course-a|Midterm Review|user|mastery|schedule/i);
  assert.deepEqual(request.blocks[0], {
    blockId: 'p-12',
    paragraphIndex: 12,
    pageNumber: 3,
    lineIndex: 5,
    text: paragraphs[0].text,
    sourceId: 'upload-1',
  });
});

test('valid AI output maps to plan-bound pending proposals with resolved evidence', () => {
  const request = createQuestionGenerationRequest({ paragraphs, sourceId: 'upload-1', studyPlanId: 'plan-a', studyPlans });
  const proposals = mapQuestionGenerationResponse(JSON.stringify({ proposals: [{
    type: 'single-answer',
    prompt: 'What does osmosis describe?',
    answer: 'The movement of water across a selectively permeable membrane.',
    explanation: 'The supplied passage defines osmosis this way.',
    conceptLabel: 'Osmosis',
    evidenceBlockIds: ['p-12'],
  }] }), request, { sourceCourseId: 'course-a', generatedAt: '2026-09-26T00:00:00.000Z' });

  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].studyPlanId, 'plan-a');
  assert.equal(proposals[0].status, 'pending-review');
  assert.equal(proposals[0].provenance.model, 'qwen3-coder:latest');
  assert.equal(proposals[0].sourceReferences[0].paragraphIndex, 12);
});

test('invalid evidence and unsupported output are rejected', () => {
  const request = createQuestionGenerationRequest({ paragraphs, sourceId: 'upload-1', studyPlanId: 'plan-a', studyPlans });
  const base = { prompt: 'Question', answer: 'Answer', explanation: 'Reason', conceptLabel: 'Concept' };
  assert.throws(() => mapQuestionGenerationResponse(JSON.stringify({ proposals: [{ ...base, type: 'multiple-choice', evidenceBlockIds: ['p-12'] }] }), request), /incomplete or unsupported/);
  assert.throws(() => mapQuestionGenerationResponse(JSON.stringify({ proposals: [{ ...base, type: 'single-answer', evidenceBlockIds: ['missing'] }] }), request), /unknown evidence block/);
  assert.throws(() => createQuestionGenerationRequest({ paragraphs: [{ text: 'x'.repeat(6001) }], sourceId: 'upload-1', studyPlanId: 'plan-a', studyPlans }), /6,000/);
});

test('fixed Ollama path reuses extraction, does not persist, and does not touch active questions', async () => {
  let extractionCalls = 0;
  const repository = createQuestionRepository();
  const response = await generateOllamaQuestionProposals({
    file: { name: 'notes.pdf' },
    sourceId: 'upload-1',
    studyPlanId: 'plan-a',
    studyPlans,
    extractionPipeline: {
      async extractImportDocument(file) {
        extractionCalls += 1;
        assert.equal(file.name, 'notes.pdf');
        return { paragraphs };
      },
    },
    fetchImplementation: async (url, options) => {
      assert.equal(url, 'http://localhost:11434/api/generate');
      const body = JSON.parse(options.body);
      assert.equal(body.model, 'qwen3-coder:latest');
      return { ok: true, async json() { return { response: JSON.stringify({ proposals: [{
        type: 'single-answer', prompt: 'What is osmosis?', answer: 'Water movement.', explanation: 'Source definition.', conceptLabel: 'Osmosis', evidenceBlockIds: ['p-12'],
      }] }) }; } };
    },
  });

  assert.equal(extractionCalls, 1);
  assert.equal(response.proposals[0].status, 'pending-review');
  assert.deepEqual(repository.getAllQuestionIds(), []);
  assert.deepEqual(repository.getSchedulableQuestions(), []);
});