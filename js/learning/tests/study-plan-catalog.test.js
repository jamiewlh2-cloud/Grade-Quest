import test from 'node:test';
import assert from 'node:assert/strict';

import { createEmptyLearningState } from '../learningPersistence.js';
import { createStudyPlanCatalog } from '../studyPlanCatalog.js';

function createHarness() {
  let state = createEmptyLearningState();
  let id = 0;
  let time = 0;
  const catalog = createStudyPlanCatalog({
    loadState: () => state,
    saveState: nextState => { state = nextState; return state; },
    createId: () => `plan-${++id}`,
    now: () => `2026-09-26T10:00:0${time++}.000Z`,
  });
  return { catalog, getState: () => state };
}

test('creates and lists multiple independent plans for one course', () => {
  const { catalog } = createHarness();
  const midterm = catalog.createStudyPlan({ courseId: 'COMP-2712', name: 'Midterm Review' });
  const final = catalog.createStudyPlan({ courseId: 'COMP-2712', name: 'Final Exam Review', description: 'Cumulative review' });
  catalog.createStudyPlan({ courseId: 'MATH-2718', name: 'Chapter 1 Review' });

  assert.equal(midterm.studyPlanId, 'plan-1');
  assert.equal(final.description, 'Cumulative review');
  assert.deepEqual(catalog.listStudyPlansByCourse('COMP-2712').map(plan => plan.name), ['Midterm Review', 'Final Exam Review']);
  assert.deepEqual(catalog.listStudyPlansByCourse('MATH-2718').map(plan => plan.name), ['Chapter 1 Review']);
});

test('renaming preserves stable identity and learning history', () => {
  const { catalog, getState } = createHarness();
  const created = catalog.createStudyPlan({ courseId: 'COMP-2712', name: 'Midterm Review' });
  getState().questions.push({ studyPlanId: created.studyPlanId, questionId: 'q-1' });

  const renamed = catalog.renameStudyPlan(created.studyPlanId, 'Midterm Recovery');
  assert.equal(renamed.studyPlanId, created.studyPlanId);
  assert.equal(renamed.name, 'Midterm Recovery');
  assert.equal(getState().questions[0].studyPlanId, created.studyPlanId);
});

test('archives plans without deleting them and hides them from the active list', () => {
  const { catalog } = createHarness();
  const created = catalog.createStudyPlan({ courseId: 'COMP-2712', name: 'Old Review' });
  const archived = catalog.archiveStudyPlan(created.studyPlanId);

  assert.equal(archived.archived, true);
  assert.equal(archived.status, 'archived');
  assert.deepEqual(catalog.listStudyPlansByCourse('COMP-2712'), []);
  assert.equal(catalog.listStudyPlansByCourse('COMP-2712', { includeArchived: true })[0].studyPlanId, created.studyPlanId);
});

test('deletion uses a terminal marker and preserves plan-owned records and sibling plans', () => {
  const { catalog, getState } = createHarness();
  const deleted = catalog.createStudyPlan({ courseId: 'COMP-2712', name: 'Delete Me' });
  const sibling = catalog.createStudyPlan({ courseId: 'COMP-2712', name: 'Keep Me' });
  getState().sessions.push({ studyPlanId: deleted.studyPlanId, sessionId: 'session-1' });

  const result = catalog.deleteStudyPlan(deleted.studyPlanId);
  assert.equal(result.status, 'deleted');
  assert.equal(result.archived, true);
  assert.equal(getState().sessions[0].studyPlanId, deleted.studyPlanId);
  assert.deepEqual(catalog.listStudyPlansByCourse('COMP-2712').map(plan => plan.studyPlanId), [sibling.studyPlanId]);
  assert.equal(catalog.getStudyPlan(deleted.studyPlanId).status, 'deleted');
});

test('rejects missing identity and prevents deleted-plan mutation', () => {
  const { catalog } = createHarness();
  assert.throws(() => catalog.createStudyPlan({ courseId: 'COMP-2712', name: '' }), /name is required/);
  assert.throws(() => catalog.listStudyPlansByCourse(''), /courseId is required/);

  const deleted = catalog.createStudyPlan({ courseId: 'COMP-2712', name: 'Delete Me' });
  catalog.deleteStudyPlan(deleted.studyPlanId);
  assert.throws(() => catalog.renameStudyPlan(deleted.studyPlanId, 'Renamed'), /cannot be renamed/);
});
