export function createObjectiveCatalog(initialObjectives = []) {
  const objectivesById = new Map();
  const objectivesByCourse = new Map();
  const objectivesByStudyPlan = new Map();

  for (const objective of initialObjectives) {
    registerObjective(objective);
  }

  function registerObjective(objective) {
    if (!objective || typeof objective !== 'object') {
      throw new Error('Objective payload is required.');
    }
    if (!objective.objectiveId || !objective.courseId || !objective.title) {
      throw new Error('Objective is missing required fields.');
    }
    if (objective.questionIds && !Array.isArray(objective.questionIds)) {
      throw new Error('Objective questionIds must be an array when provided.');
    }

    const normalized = {
      ...objective,
      studyPlanId: objective.studyPlanId || 'default-study-plan',
      description: objective.description || '',
      importance: typeof objective.importance === 'number' ? objective.importance : 1,
      questionIds: Array.isArray(objective.questionIds) ? [...objective.questionIds] : [],
      active: objective.active !== false,
    };

    if (objectivesById.has(normalized.objectiveId)) {
      throw new Error(`Objective ${normalized.objectiveId} already exists.`);
    }

    objectivesById.set(normalized.objectiveId, normalized);

    const courseKey = normalized.courseId || 'uncategorized';
    const courseList = objectivesByCourse.get(courseKey) || [];
    courseList.push(normalized.objectiveId);
    objectivesByCourse.set(courseKey, courseList);

    const studyPlanKey = normalized.studyPlanId || 'default-study-plan';
    const studyPlanList = objectivesByStudyPlan.get(studyPlanKey) || [];
    studyPlanList.push(normalized.objectiveId);
    objectivesByStudyPlan.set(studyPlanKey, studyPlanList);
  }

  function getObjectiveById(objectiveId) {
    return objectivesById.get(objectiveId) || null;
  }

  function getObjectivesByCourse(courseId) {
    const ids = objectivesByCourse.get(courseId) || [];
    return ids.map(id => objectivesById.get(id)).filter(Boolean);
  }

  function getObjectivesByStudyPlan(studyPlanId) {
    const ids = objectivesByStudyPlan.get(studyPlanId) || [];
    return ids.map(id => objectivesById.get(id)).filter(Boolean);
  }

  function getQuestionIdsForObjective(objectiveId) {
    const objective = objectivesById.get(objectiveId);
    return objective ? [...objective.questionIds] : [];
  }

  function getAllObjectiveIds() {
    return Array.from(objectivesById.keys());
  }

  function deactivateObjective(objectiveId) {
    const objective = objectivesById.get(objectiveId);
    if (!objective) {
      return false;
    }
    objective.active = false;
    return true;
  }

  return {
    registerObjective,
    getObjectiveById,
    getObjectivesByCourse,
    getObjectivesByStudyPlan,
    getQuestionIdsForObjective,
    getAllObjectiveIds,
    deactivateObjective,
  };
}
