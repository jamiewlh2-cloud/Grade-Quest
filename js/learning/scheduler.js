export function scoreSchedulingPriority(item) {
  const mastery = Number(item.mastery ?? 10);
  const need = 100 - mastery;
  const urgency = Math.max(0, Number(item.overdueDays ?? 0) * 10 + (item.dueAt ? 5 : 0));
  const risk = (Number(item.recentErrors ?? 0) * 15) + (item.overconfidenceFlag ? 20 : 0) + (Number(item.recentIncorrectCount ?? 0) * 8);
  const coverage = Number(item.coverageScore ?? 0);
  const total = need + urgency + risk + coverage;

  return { need, urgency, risk, coverage, total };
}

export function buildDeterministicQueue(items, { studyPlanId } = {}) {
  if (!studyPlanId) {
    throw new Error('A studyPlanId is required for scheduling.');
  }

  const filtered = (items || []).filter(item => item.studyPlanId === studyPlanId);
  return filtered
    .map(item => ({ ...item, ...scoreSchedulingPriority(item) }))
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;

      const dueA = new Date(a.dueAt || 0).getTime();
      const dueB = new Date(b.dueAt || 0).getTime();
      if (dueA !== dueB) return dueA - dueB;

      const masteryDiff = (a.mastery ?? 10) - (b.mastery ?? 10);
      if (masteryDiff !== 0) return masteryDiff;

      return String(a.questionId || '').localeCompare(String(b.questionId || ''));
    });
}
