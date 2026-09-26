import { INITIAL_MASTERY, normalizeQuestion } from './schema.js';

export function createQuestionRepository(initialQuestions = []) {
  const questionsById = new Map();
  const questionsByCourse = new Map();
  const questionsByObjective = new Map();
  const questionsByType = new Map();

  for (const question of initialQuestions) {
    registerQuestion(question);
  }

  function registerQuestion(question) {
    const normalized = normalizeQuestion(question);
    if (questionsById.has(normalized.questionId)) {
      throw new Error(`Question ${normalized.questionId} already exists.`);
    }

    questionsById.set(normalized.questionId, { ...normalized, mastery: typeof normalized.mastery === 'number' ? normalized.mastery : INITIAL_MASTERY });

    const courseKey = normalized.courseId || 'uncategorized';
    const courseList = questionsByCourse.get(courseKey) || [];
    courseList.push(normalized.questionId);
    questionsByCourse.set(courseKey, courseList);

    for (const objectiveId of normalized.objectiveIds) {
      const objectiveList = questionsByObjective.get(objectiveId) || [];
      objectiveList.push(normalized.questionId);
      questionsByObjective.set(objectiveId, objectiveList);
    }

    const typeList = questionsByType.get(normalized.type) || [];
    typeList.push(normalized.questionId);
    questionsByType.set(normalized.type, typeList);
  }

  function getQuestionById(questionId) {
    return questionsById.get(questionId) || null;
  }

  function getQuestionsByCourse(courseId) {
    const ids = questionsByCourse.get(courseId) || [];
    return ids.map(id => questionsById.get(id)).filter(Boolean);
  }

  function getQuestionsByObjective(objectiveId) {
    const ids = questionsByObjective.get(objectiveId) || [];
    return ids.map(id => questionsById.get(id)).filter(Boolean);
  }

  function getQuestionsByType(type) {
    const ids = questionsByType.get(type) || [];
    return ids.map(id => questionsById.get(id)).filter(Boolean);
  }

  function getAllQuestionIds() {
    return Array.from(questionsById.keys());
  }

  function getSchedulableQuestions() {
    return Array.from(questionsById.values()).filter(question => question.active !== false);
  }

  function deactivateQuestion(questionId) {
    const question = questionsById.get(questionId);
    if (!question) {
      return false;
    }
    question.active = false;
    return true;
  }

  return {
    registerQuestion,
    getQuestionById,
    getQuestionsByCourse,
    getQuestionsByObjective,
    getQuestionsByType,
    getAllQuestionIds,
    getSchedulableQuestions,
    deactivateQuestion,
  };
}
