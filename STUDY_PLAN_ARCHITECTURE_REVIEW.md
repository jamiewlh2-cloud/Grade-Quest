# Study Plan Architecture Review

**Status:** Clarification impact assessment
**Scope:** Multiple independent adaptive-learning study plans within one Grade Quest course
**Source documents:** `TEAM_CONTEXT.md`, `DESIGN_DOCUMENT.md`, `LEARNING_ENGINE_ARCHITECTURE.md`, and `LEARNING_ENGINE_IMPLEMENTATION_PLAN.md`

## 1. Impact Assessment

This requirement materially affects the learning-engine architecture, storage structures, ownership model, mastery tracking, scheduling, analytics, and milestone sequencing. It does not change the deterministic learning behaviour defined in `DESIGN_DOCUMENT.md`.

The new ownership hierarchy is:

```text
User
└── Course
    └── Study plan
        ├── Questions
        ├── Learning objectives
        ├── Mastery records
        ├── Review schedules
        ├── Learning sessions
        ├── Response history
        └── Analytics
```

A course may have zero study plans. A course must not imply a default learning plan, questions, objectives, mastery state, schedule, or analytics. Learning features should be empty or unavailable until a plan exists.

The current architecture and implementation plan use `courseId` as the principal learning scope. A course-scoped session, scheduler query, analytics query, or imported question bank would otherwise mix independent plans and make deletion or renaming unsafe.

| Area | Impact | Decision |
| --- | --- | --- |
| Architecture | High | Add study plans as an explicit aggregate beneath courses. |
| Storage structures | High | Persist versioned study-plan records and add `studyPlanId` to all plan-owned records. |
| Ownership | High | Course owns zero or more plans; the plan owns learning content and progress. |
| Mastery | High | Scope mastery by study plan; do not share mastery between plans by default. |
| Scheduling | High | Build queues within one selected plan; no cross-plan ordering initially. |
| Analytics | High | Aggregate and display metrics per plan; course summaries are rollups. |
| Milestones | High | Add plan management and assignment before question catalog and progress work. |
| Learning behaviour | None intended | Keep confidence, mastery deltas, intervals, recovery, and pass rules unchanged. |
| Unrelated Grade Quest systems | Low | Existing grades, assessments, planner, timers, and flashcards remain unchanged. |

## 2. Required Architecture Changes

### Study plan as an explicit component

Add a Study Plan Catalog/Manager to the learning architecture. It must:

- Create, list, select, rename, and independently delete plans within a course.
- Maintain stable plan IDs and names.
- Enforce that a plan belongs to exactly one existing course.
- Provide selected-plan context to the question repository, objective catalog, session coordinator, scheduler, review planner, and analytics aggregator.
- Prevent learning records from being queried or mutated without an explicit plan context.

The manager must support zero plans for a course and must not create an implicit plan when a course is opened. Renaming changes presentation metadata only and must preserve the plan ID and learning history.

### Ownership boundaries

The course remains an academic workspace container. The study plan becomes the learning aggregate. Questions and objectives belong to a plan, and the plan resolves to its parent course.

Plan-scoped learning-engine operations must require `studyPlanId`. A course ID may list plans or produce an explicitly labelled course rollup, but it must not substitute for plan context in learning decisions.

### Question-bank assignment boundary

Imported, manually authored, and future AI-generated question banks must receive a specific target study plan before entering the question repository. The repository must reject a bank with a missing, unknown, or cross-course target plan.

The initial implementation should assign one bank to one plan. Moving a bank between plans, if later supported, requires an explicit migration decision because it affects ownership and progress semantics.

### Course-level rollups

Course-level learning summaries may aggregate plans, but they are derived views rather than sources of truth. Rollups must identify included plans and must not imply that mastery transfers between plans.

### Independent deletion

Deleting a study plan must affect only that plan's active questions, objectives, schedules, sessions, response history, mastery, and plan analytics. It must not delete the parent course or sibling plans.

Before implementation, decide whether deletion is reversible archive or permanent removal. No deletion semantics should be invented implicitly.

## 3. Required Data Model Changes

### Study plan record

Add a persisted `StudyPlan` structure:

- `studyPlanId`: stable identifier.
- `courseId`: owning Grade Quest course ID.
- `name`: required user-facing name.
- `createdAt` and `updatedAt`.
- `status`: active or the agreed deletion/archive state.
- Optional display ordering if needed by the course UI.

Renaming changes `name` and `updatedAt` only. It must not rewrite question IDs, objective IDs, response IDs, mastery records, schedule entries, or session history.

### Required ownership fields

Add `studyPlanId` to every plan-owned learning record:

- Questions and question-bank metadata.
- Learning objectives.
- Question-concept mastery records.
- Retrieval response events.
- Learning sessions.
- Review schedule entries.
- Recovery sequences and session queue records.
- Derived analytics records or cache keys.
- Future generated-question provenance and import records.

`courseId` may remain denormalized for filtering and auditability, but it must agree with the study plan's owning course.

### Identity and uniqueness

Names are mutable metadata, not identifiers. Records must use stable IDs. At minimum:

- A mastery key includes `studyPlanId`, `questionId`, and `conceptId`.
- An objective has an ID independent of its title.
- Sessions and response events retain the plan ID active when they were created.
- A question is never addressed only by prompt text.

### Mastery model changes

Mastery remains attached to the question-concept pair, but that pair is now scoped to a study plan:

```text
(studyPlanId, questionId, conceptId)
```

The same content used in two plans has independent mastery unless a future explicit cross-plan evidence policy is introduced. Correctness, confidence calibration, delayed retrieval, repeated-error signals, recovery state, and interval state must not leak between plans.

### Scheduling model changes

Every schedule entry includes `studyPlanId`. Scheduler inputs, objective importance, due dates, current-session coverage, and tie-breaking are calculated from the selected plan only.

A due question in one plan must not reorder or suppress a question in another plan. A future combined study mode would require a separate product decision.

### Session model changes

Every initial learning session has exactly one `studyPlanId`. Its `courseId` may be retained as denormalized context and validated against the plan. Queue, pass, response, objective coverage, recovery, and completion state are plan-local.

### Analytics model changes

Analytics read models and cache keys include `studyPlanId`. Accuracy, delayed retention, mastery bands, confidence calibration, due/overdue state, recovery, and review adherence are available per plan.

Course analytics are derived rollups across selected or all plans and must expose plan boundaries. A course with zero plans has no learning analytics, though it may still have ordinary course, study-time, grade, and assessment analytics.

### Storage and snapshot changes

The proposed `learningContent` and `learningProgress` records must support:

- Zero plans for any course.
- Independent plan rename and deletion.
- Lookup by course ID and stable plan ID.
- Validation of every child record's plan ownership.
- Migration from pre-study-plan learning data if any exists.
- Backup and restore without mixing sibling plans.

The schema version must advance when study-plan ownership is introduced. Older backups without learning data remain valid. Older learning payloads require an explicit migration policy; they must not be assigned to a default plan by assumption.

## 4. Required Implementation-Plan Changes

Study-plan ownership must precede question/objective catalog work because catalog records, persistence keys, IDs, and tests need the correct scope from the beginning.

### Add a new Milestone 1: Study-plan domain and ownership contracts

**Shippable result:** Courses can have zero or more named study-plan records, and learning-owned records can resolve their plan and parent course.

**Work:** Define stable plan IDs, required names, course ownership, rename semantics, deletion/archive semantics, plan selection context, child-record ownership validation, and the rule that no plan is implicit. Define how a course rollup identifies its plans.

**Exit checks:** A course can contain zero, one, or multiple plans; sibling plans remain isolated; renaming preserves IDs and history; deleting one plan does not affect its course or siblings; invalid or cross-course plan references are rejected.

### Renumber the existing milestones

The current Milestones 1-9 should become Milestones 2-10, preserving their existing work while adding plan scope:

- Domain contracts include `studyPlanId` in stable IDs, fixtures, event fields, and invariants.
- The question/objective catalog requires plan assignment and supports plan queries.
- Response, mastery, and confidence evaluation uses the plan-scoped mastery key.
- The review planner and scheduler produce queues within one plan.
- The session coordinator creates only plan-scoped sessions.
- The Study experience provides plan selection, creation, and empty-plan states.
- Persistence, synchronization, backup, restore, reset, and migration preserve plan boundaries.
- Analytics makes plan read models primary and course rollups explicit.
- Hardening tests plan deletion, sibling isolation, rename stability, and question-bank assignment.

### Update required modules

The implementation plan should add or adjust these responsibilities:

- `js/learning/studyPlanCatalog.js`: plan CRUD, selection, ownership, rename, and delete/archive rules.
- `js/learning/questionRepository.js`: require and validate `studyPlanId`.
- `js/learning/objectiveCatalog.js`: require plan ownership.
- `js/learning/masteryEvaluator.js`: use the plan-scoped mastery identity.
- `js/learning/reviewPlanner.js` and `js/learning/scheduler.js`: accept plan context and exclude sibling plans.
- `js/learning/sessionCoordinator.js`: require exactly one plan per initial session.
- `js/learning/analytics.js`: expose plan-level read models and labelled course rollups.
- `js/learning/schema.js`: add study-plan schema, ownership validation, and migration version.
- `js/learning/learningEngine.js`: require plan context for plan-scoped operations.
- `js/script.js` and `js/productivity.js`: add lifecycle and UI entry points only; keep learning decisions in learning modules.

### Move question-bank assignment earlier

Plan selection must exist before catalog fixtures or content loading. Every fixture, import adapter, and future generator contract must specify a target `studyPlanId`. A bank with only a course ID is incomplete for the adaptive-learning catalog.

### Add required tests

- Plan creation, zero-plan courses, rename stability, and independent deletion.
- Child-record ownership validation and cross-course reference rejection.
- The same question/concept in two plans has independent mastery and schedules.
- A due item in one plan cannot appear in another plan's queue.
- Sessions, response events, recovery, and analytics retain the correct plan ID.
- Course rollups do not replace or mutate plan state.
- Imported and generated banks cannot activate without a target plan.
- Storage migration, backup/restore, UID isolation, and snapshot round trips preserve sibling-plan boundaries.

## 5. Risk Assessment

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Existing course-scoped assumptions mix plans | High | Require `studyPlanId` for learning operations and reject missing context. |
| Mastery or schedules leak between plans | High | Use a composite plan-scoped identity, filter scheduler queries by plan, and add isolation tests. |
| Plan deletion removes sibling or course data | High | Define archive versus permanent deletion and require explicit confirmation. |
| Existing learning data cannot be assigned safely | High | Do not silently invent a default plan; decide migration handling first. |
| Imported or AI-generated banks are assigned ambiguously | High | Require and validate a target plan before activation. |
| Course analytics obscure independent plans | Medium | Make plan analytics primary and label course rollups with included plans. |
| Plan names are treated as stable identifiers | Medium | Use immutable IDs for references. |
| Snapshot and local-storage size increases | Medium | Reuse the current storage boundary and include plans in event-retention decisions. |
| UI complexity grows inside course views | Medium | Use a focused plan selector and explicit empty state. |
| Future combined study mode creates ambiguous ownership | Medium | Keep initial sessions single-plan and design combined mode separately. |
| Existing course features regress | Low | Keep grades, assessments, planner, timers, and flashcards outside the study-plan aggregate. |

The highest-risk decision is the treatment of learning records that may exist before study plans are introduced. They must not be assigned to a plan by assumption because that would create false ownership and potentially false mastery history.

## 6. Recommended Next Steps

1. Accept study plans as the explicit learning aggregate beneath courses.
2. Decide whether deletion is permanent removal or reversible archive.
3. Decide how any pre-study-plan learning records will be handled; do not create an undocumented default plan.
4. Update `LEARNING_ENGINE_ARCHITECTURE.md` with the Study Plan Catalog and plan assignment rules.
5. Update `LEARNING_ENGINE_IMPLEMENTATION_PLAN.md` by inserting the study-plan foundation milestone before question/objective catalog work.
6. Define the versioned storage shape and migration contract for plans, content, progress, sessions, and response history.
7. Make `studyPlanId` mandatory in domain fixtures and contracts before question validation or scheduling work.
8. Build the isolation test matrix for mastery, schedule, session, analytics, rename, deletion, backup, restore, and cross-course references.
9. Add plan selection and empty-plan states only after domain and persistence contracts are settled.
10. Require a target study plan in all future question-bank import and AI-generation interfaces; keep deterministic learning rules unchanged.
