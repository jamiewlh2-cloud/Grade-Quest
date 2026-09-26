export const QUESTION_PROPOSAL_STATUS = 'pending-review';

const FORBIDDEN_CATALOG_FIELDS = ['questionId', 'active', 'mastery', 'objectiveIds'];

export function validateQuestionProposal(proposal, { studyPlans } = {}) {
  if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal)) {
    throw new Error('Question proposal must be an object.');
  }

  if (!Array.isArray(studyPlans)) {
    throw new Error('StudyPlan records are required to validate a proposal.');
  }

  const studyPlan = studyPlans.find(plan => plan && plan.studyPlanId === proposal.studyPlanId);
  if (!studyPlan || !studyPlan.courseId) {
    throw new Error('Question proposal references an unknown StudyPlan.');
  }

  if (!proposal.proposalId || proposal.status !== QUESTION_PROPOSAL_STATUS) {
    throw new Error('Question proposal identity or review status is invalid.');
  }

  if (FORBIDDEN_CATALOG_FIELDS.some(field => Object.hasOwn(proposal, field))) {
    throw new Error('Question proposals must not contain active-catalog fields.');
  }

  const candidate = proposal.candidate;
  if (!candidate || candidate.type !== 'single-answer'
    || !candidate.prompt || !candidate.answer || !candidate.explanation || !candidate.conceptLabel) {
    throw new Error('Question proposal candidate is incomplete or unsupported.');
  }

  const sourceReferences = Array.isArray(proposal.sourceReferences)
    ? proposal.sourceReferences
    : proposal.sourceReference
      ? [proposal.sourceReference]
      : [];
  if (!sourceReferences.length || sourceReferences.some(sourceReference => (
    !sourceReference || !sourceReference.sourceId || !sourceReference.excerpt
    || !Number.isInteger(sourceReference.paragraphIndex) || sourceReference.paragraphIndex < 0
    || !Number.isInteger(sourceReference.pageNumber) || sourceReference.pageNumber < 0
    || !Number.isInteger(sourceReference.lineIndex) || sourceReference.lineIndex < 0
  ))) {
    throw new Error('Question proposal source reference is incomplete.');
  }

  if (sourceReferences.some(sourceReference => (
    sourceReference.courseId && sourceReference.courseId !== studyPlan.courseId
  ))) {
    throw new Error('Question proposal source belongs to a different course than its StudyPlan.');
  }

  const provenance = proposal.provenance;
  const validProvenance = provenance && provenance.version === 1 && (
    provenance.generator === 'explicit-term-definition'
    || (
      provenance.generator === 'ollama-question-generation'
      && provenance.provider === 'ollama'
      && provenance.model === 'qwen3-coder:latest'
      && provenance.promptVersion === 1
    )
  );
  if (!validProvenance) {
    throw new Error('Question proposal provenance is invalid.');
  }

  return proposal;
}