import { createEmptyLearningState, validateLearningState } from './learningPersistence.js';

const ACTIVE_STATUS = 'active';
const ARCHIVED_STATUS = 'archived';
const DELETED_STATUS = 'deleted';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function requireText(value, fieldName) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`${fieldName} is required.`);
  return text;
}

function requireState(loadState) {
  const state = loadState?.() || createEmptyLearningState();
  return validateLearningState(state);
}

function findPlan(state, studyPlanId) {
  const id = requireText(studyPlanId, 'studyPlanId');
  const plan = state.plans.find(candidate => candidate.studyPlanId === id);
  if (!plan) throw new Error(`StudyPlan not found: ${id}`);
  return plan;
}

function saveUpdatedState(state, saveState) {
  if (typeof saveState !== 'function') throw new Error('A saveState function is required.');
  return saveState(validateLearningState(state));
}

export function createStudyPlanCatalog({ loadState, saveState, now = () => new Date().toISOString(), createId = () => `study-plan-${Date.now()}` } = {}) {
  function createStudyPlan({ courseId, name, description = '' } = {}) {
    const state = requireState(loadState);
    const course = requireText(courseId, 'courseId');
    const planName = requireText(name, 'name');
    const studyPlanId = requireText(createId(), 'studyPlanId');
    const timestamp = now();

    if (state.plans.some(plan => plan.studyPlanId === studyPlanId)) {
      throw new Error(`StudyPlan already exists: ${studyPlanId}`);
    }

    const plan = {
      studyPlanId,
      courseId: course,
      name: planName,
      description: String(description ?? '').trim(),
      createdAt: timestamp,
      updatedAt: timestamp,
      lastStudiedAt: null,
      archived: false,
      status: ACTIVE_STATUS,
    };

    saveUpdatedState({ ...state, plans: [...state.plans, plan] }, saveState);
    return clone(plan);
  }

  function listStudyPlansByCourse(courseId, { includeArchived = false } = {}) {
    const course = requireText(courseId, 'courseId');
    const state = requireState(loadState);
    return state.plans
      .filter(plan => plan.courseId === course)
      .filter(plan => plan.status !== DELETED_STATUS)
      .filter(plan => includeArchived || !plan.archived)
      .map(clone);
  }

  function getStudyPlan(studyPlanId) {
    return clone(findPlan(requireState(loadState), studyPlanId));
  }

  function renameStudyPlan(studyPlanId, name, description) {
    const state = requireState(loadState);
    const plan = findPlan(state, studyPlanId);
    if (plan.status === DELETED_STATUS) throw new Error('Deleted StudyPlans cannot be renamed.');

    const updatedPlan = {
      ...plan,
      name: requireText(name, 'name'),
      description: typeof description === 'undefined' ? plan.description : String(description).trim(),
      updatedAt: now(),
    };
    const plans = state.plans.map(candidate => candidate.studyPlanId === plan.studyPlanId ? updatedPlan : candidate);
    saveUpdatedState({ ...state, plans }, saveState);
    return clone(updatedPlan);
  }

  function archiveStudyPlan(studyPlanId) {
    const state = requireState(loadState);
    const plan = findPlan(state, studyPlanId);
    if (plan.status === DELETED_STATUS) throw new Error('Deleted StudyPlans cannot be archived.');

    const archivedPlan = {
      ...plan,
      archived: true,
      status: ARCHIVED_STATUS,
      updatedAt: now(),
    };
    const plans = state.plans.map(candidate => candidate.studyPlanId === plan.studyPlanId ? archivedPlan : candidate);
    saveUpdatedState({ ...state, plans }, saveState);
    return clone(archivedPlan);
  }

  function deleteStudyPlan(studyPlanId) {
    const state = requireState(loadState);
    const plan = findPlan(state, studyPlanId);
    if (plan.status === DELETED_STATUS) throw new Error('StudyPlan is already deleted.');
    const timestamp = now();

    const deletedPlan = {
      ...plan,
      archived: true,
      status: DELETED_STATUS,
      deletedAt: timestamp,
      updatedAt: timestamp,
    };
    const plans = state.plans.map(candidate => candidate.studyPlanId === plan.studyPlanId ? deletedPlan : candidate);
    saveUpdatedState({ ...state, plans }, saveState);
    return clone(deletedPlan);
  }

  return {
    createStudyPlan,
    listStudyPlansByCourse,
    getStudyPlan,
    renameStudyPlan,
    archiveStudyPlan,
    deleteStudyPlan,
  };
}

export function createUserStudyPlanCatalog() {
  if (typeof window === 'undefined' || typeof window.getGradeQuestLearningState !== 'function' || typeof window.saveGradeQuestLearningState !== 'function') {
    throw new Error('Authenticated learning-state storage is not available.');
  }

  return createStudyPlanCatalog({
    loadState: () => window.getGradeQuestLearningState(),
    saveState: state => window.saveGradeQuestLearningState(state),
  });
}

export { ACTIVE_STATUS, ARCHIVED_STATUS, DELETED_STATUS };

if (typeof window !== 'undefined') {
  window.GradeQuestStudyPlanCatalog = { createStudyPlanCatalog, createUserStudyPlanCatalog };
}
