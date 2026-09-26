# StudyPlan Entity Review

**Status:** Architecture clarification review
**Scope:** Formal StudyPlan entity for independent learning environments within a course
**Source documents:** `TEAM_CONTEXT.md`, `LEARNING_ENGINE_ARCHITECTURE.md`, `STUDY_PLAN_ARCHITECTURE_REVIEW.md`, and `LEARNING_ENGINE_IMPLEMENTATION_PLAN.md`

## 1. Required StudyPlan Fields

`StudyPlan` should be a persistent domain entity owned by one Grade Quest course.

Required fields:

- `studyPlanId`: immutable stable identifier. Names are not references.
- `courseId`: immutable owning course identifier for the initial implementation.
- `name`: required user-facing study-plan name.
- `status`: `active`, `archived`, or `deleted`, subject to the final deletion policy.
- `createdAt`: creation timestamp.
- `updatedAt`: last metadata or lifecycle update timestamp.

Recommended supporting fields:

- `archivedAt`, when applicable.
- `deletedAt` or a retained deletion marker, when applicable.
- `displayOrder`, if plans need explicit ordering within a course.
- `schemaVersion`, if the entity is stored independently from the learning payload.

Renaming changes only `name` and `updatedAt`. It preserves the plan ID and all learning history.

## 2. Ownership Relationships

```text
User
└── Course
    └── StudyPlan
        ├── Question banks
        ├── Questions
        ├── Objectives
        ├── Mastery records
        ├── Review schedules
        ├── Learning sessions
        ├── Response history
        └── Analytics
```

- A course may contain zero or more StudyPlans.
- A StudyPlan belongs to exactly one course.
- Opening a course must not create an implicit plan.
- Questions, objectives, question banks, mastery, schedules, sessions, responses, recovery state, and analytics belong to exactly one StudyPlan in the initial model.
- Every learning-owned record must carry or resolve a valid `studyPlanId`.
- A question duplicated into another plan is an independent learning item; mastery, confidence history, scheduling, review state, and analytics do not transfer automatically.
- Course-level learning metrics are derived rollups, not sources of truth.
- Imported and AI-generated question banks require a specific target StudyPlan before activation.

## 3. Lifecycle States

### Active

The plan is visible within its course and may receive content, sessions, mastery updates, schedules, reviews, and analytics.

### Archived

The plan remains identifiable and its history is preserved, but it is excluded from normal active-plan selection and new-content assignment. Archiving is the recommended state for stopping active study without losing history.

### Deleted

Deletion is an explicit terminal action affecting only the selected plan. The parent course and sibling plans remain intact. The implementation must decide whether deletion means:

- Soft deletion, retaining the entity and history but excluding it from normal workflows; or
- Permanent deletion after confirmation and any required retention period.

Suggested transitions:

```text
Active -> Archived
Active -> Deleted
Archived -> Active
Archived -> Deleted
```

Whether a deleted plan can be restored must be explicitly decided. It must not be inferred from rename or archive behaviour.

## 4. Storage Implications

StudyPlans must use the existing `GradeQuestStorage` user-scoped persistence boundary and participate in the versioned learning content/progress payload or an equivalent dedicated user-scoped record.

Storage must support:

- Zero or multiple plans per course.
- Stable IDs independent of names.
- Rename without rewriting child records.
- Independent archive and deletion.
- Lookup by `courseId` and `studyPlanId`.
- Validation that each child belongs to an existing plan and matching course.
- Backup, restore, user switching, reset, and Firebase snapshot synchronization.

All plan-owned records must be scoped by `studyPlanId`, including questions, objectives, question-concept mastery, response events, review schedules, sessions, recovery sequences, analytics read models, and import/generation provenance. Mastery identity is `(studyPlanId, questionId, conceptId)`.

Introducing the entity requires a learning-payload schema version change. Older backups without learning data remain valid. Existing learning data must not be silently assigned to a default plan; migration requires an explicit policy.

## 5. Compatibility With Existing Milestones

Milestones 1–4 remain complete for their existing deterministic learning behaviour. Formalizing StudyPlan does not change confidence rules, mastery deltas, review intervals, recovery behaviour, or scheduling logic. It establishes the ownership context that later work must use.

Before reusing those contracts for new work:

- Questions and objectives must include `studyPlanId` ownership.
- Mastery must use the plan-scoped identity.
- Scheduler inputs and queues must be limited to the selected plan.
- Tests must cover cross-plan isolation.

Milestone 5 is the first milestone that must consume the formal entity directly. Sessions should belong to exactly one active StudyPlan. Milestones 6–9 must add plan selection and CRUD UI, persistence and migration, plan-level analytics, question-bank assignment validation, lifecycle tests, and sibling-plan isolation.

No milestone should introduce cross-plan mastery transfer, cross-plan scheduling, or combined sessions without a separate business requirement.

## 6. Recommendation

Yes. The learning-engine architecture should formally introduce `StudyPlan` as a first-class entity before Milestone 5 implementation begins.

The business requirement gives plans independent ownership of questions, objectives, mastery, scheduling, analytics, and future content. Treating a plan as only a UI label or course filter would make ownership, archive, deletion, and question-bank assignment ambiguous and could cause state leakage.

Recommended boundary:

- `Course` owns zero or more `StudyPlan` entities.
- `StudyPlan` owns learning content and all learning progress.
- Plan-scoped learning operations require an explicit `studyPlanId`.
- Course metrics are derived rollups only.
- Existing deterministic learning behaviour remains unchanged.
- Archive/delete semantics, storage shape, and migration handling are decided before session and UI implementation.
