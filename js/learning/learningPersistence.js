export const LEARNING_SCHEMA_VERSION = 1;

export function createEmptyLearningState() {
  return {
    schemaVersion: LEARNING_SCHEMA_VERSION,
    plans: [],
    studyMaterials: [],
    questions: [],
    objectives: [],
    masteryRecords: [],
    responseEvents: [],
    reviewSchedules: [],
    sessions: [],
    analytics: {},
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertArray(payload, key) {
  if (!Array.isArray(payload[key])) {
    throw new Error(`Learning state field ${key} must be an array.`);
  }
}

function assertPlanId(record, fieldName) {
  if (!record || typeof record !== 'object' || !record.studyPlanId) {
    throw new Error(`${fieldName} must include a studyPlanId.`);
  }
}

export function validateLearningState(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Learning state must be an object.');
  }
  if (payload.schemaVersion !== LEARNING_SCHEMA_VERSION) {
    throw new Error(`Unsupported learning schema version: ${payload.schemaVersion}`);
  }

  const state = { ...createEmptyLearningState(), ...payload };
  ['plans', 'studyMaterials', 'questions', 'objectives', 'masteryRecords', 'responseEvents', 'reviewSchedules', 'sessions'].forEach(key => assertArray(state, key));
  if (!state.analytics || typeof state.analytics !== 'object' || Array.isArray(state.analytics)) {
    throw new Error('Learning state analytics must be an object.');
  }

  const plans = new Map();
  state.plans.forEach(plan => {
    if (!plan || !plan.studyPlanId || !plan.courseId || !plan.name || !plan.createdAt || !plan.updatedAt) {
      throw new Error('StudyPlan records require stable identity, course, name, and timestamps.');
    }
    if (plans.has(plan.studyPlanId)) {
      throw new Error(`Duplicate StudyPlan: ${plan.studyPlanId}`);
    }
    plans.set(plan.studyPlanId, plan);
  });

  const childCollections = ['studyMaterials', 'questions', 'objectives', 'masteryRecords', 'responseEvents', 'reviewSchedules', 'sessions'];
  childCollections.forEach(collectionName => {
    state[collectionName].forEach(record => {
      assertPlanId(record, collectionName);
      const plan = plans.get(record.studyPlanId);
      if (!plan) {
        throw new Error(`${collectionName} references an unknown StudyPlan.`);
      }
      if (record.courseId && record.courseId !== plan.courseId) {
        throw new Error(`${collectionName} has a cross-course StudyPlan reference.`);
      }
    });
  });

  return clone(state);
}

export function normalizeLearningState(payload) {
  if (payload === null || typeof payload === 'undefined') return createEmptyLearningState();
  return validateLearningState(payload);
}

export function loadLearningState(storage, uid) {
  const payload = storage.getJson('learningState', null, uid);
  try {
    return normalizeLearningState(payload);
  } catch (error) {
    return createEmptyLearningState();
  }
}

export function saveLearningState(storage, state, uid) {
  const validated = validateLearningState(state);
  storage.setJson('learningState', validated, uid);
  return validated;
}

if (typeof window !== 'undefined') {
  window.GradeQuestLearningPersistence = {
    LEARNING_SCHEMA_VERSION,
    createEmptyLearningState,
    validateLearningState,
    normalizeLearningState,
    loadLearningState,
    saveLearningState,
  };
}
