# Grade Quest Learning Engine Implementation Plan

**Scope:** Deterministic adaptive retrieval practice after learning questions have been authored or otherwise approved.

**Source documents:** `TEAM_CONTEXT.md` was not present in the workspace at planning time. This plan is based on `PROJECT_AUDIT.md`, `ARCHITECTURE.md`, `DESIGN_DOCUMENT.md`, and `LEARNING_ENGINE_ARCHITECTURE.md`. The architecture and design documents are authoritative for learning behavior.

## Delivery Principles

- Ship usable, bounded slices. Each milestone below has a verifiable completion condition and should be independently releasable without waiting for optional question-generation or AI work.
- Keep learning decisions deterministic and independent from rendering, Firebase availability, and model services.
- Preserve the existing vanilla-JavaScript application and `GradeQuestStorage` boundary. Do not fold student learning records into the PDF parser-training schema or reinterpret flashcard ratings as mastery evidence.
- Keep grade calculations, assessments, and academic outcomes unaffected by confidence or learning mastery.
- Treat learning analytics as evidence with provenance and sample windows, not as a single score or ranking.

## Development Phases

### Milestone 1: Domain contracts and test foundation

**Shippable result:** A documented, executable contract for questions, objectives, responses, mastery, and scheduling decisions, plus a lightweight test command for the new domain code.

**Work:** Define stable IDs, supported question types and response normalization, confidence capture rules, event fields, mastery bands, deterministic tie-breaking, clock injection, numeric bounds, and initial event-retention/size policy. Resolve ambiguities in the source specs before persistence (especially gradual decay, delayed bonus calculation, objective aggregation, and how explicit uncertainty is submitted). Add tests against the design's example outcomes and invariants.

**Exit checks:** `npm test` (or the selected equivalent) runs without a browser; the same inputs produce the same outputs; invalid question/answer structures are rejected; no correctness feedback is available before a response is committed.

### Milestone 2: Validated question and objective catalog

**Shippable result:** Approved questions and learning objectives can be loaded, validated, queried by course/objective/type, and safely deactivated without losing history.

**Work:** Implement the catalog and schema validation. Provide a small initial content-loading path for manually authored questions or a fixture dataset; importing or reading source material alone must not create mastery. Require answer completeness, explanation, objective links, application level, and source reference where relevant before a question becomes schedulable.

**Exit checks:** Valid records receive stable IDs; malformed, duplicate, or unsupported records are not scheduled; deactivation preserves historical references; catalog lookups are covered by tests.

### Milestone 3: Response, mastery, and confidence evaluation

**Shippable result:** A committed response becomes an immutable event and yields reproducible correctness, calibration, mastery, and recovery evidence.

**Work:** Implement single- and multiple-answer evaluation, uncertain/standard/certain confidence, timeout/no-response handling, before/after mastery, confidence calibration, delayed retrieval bonus, high/low-bound behavior, repeated-error signals, and confidence recalibration after overconfidence. Capture confidence before feedback and prevent post-feedback upgrades.

**Exit checks:** All response/confidence combinations match the specified rules; events are append-only; uncertain correct answers never alone establish maintained mastery; certain incorrect answers carry the stronger correction; repeated evaluation does not mutate prior events.

### Milestone 4: Review planner and deterministic scheduler

**Shippable result:** Given a catalog and progress state, the engine produces a stable queue with due, overdue, weak, recovery, new, and maintenance items.

**Work:** Implement interval progression (approximately 1, 3, 7, 14, 30, then 45-60 days), earlier reviews after errors/uncertainty/calibration failures, gradual decay as a scheduling signal, recovery steps, objective coverage, interleaving, and stable tie-breaking. Keep scheduling priority inputs inspectable for tests and later analytics.

**Exit checks:** Fixed fixtures always yield the same ordered queue; due/overdue work precedes new work under specified conditions; retries are separated after repeated errors; schedule outcomes match interval and recovery rules.

### Milestone 5: Resumable learning-session coordinator

**Shippable result:** A session can be planned, started, paused/resumed, answered, advanced through learning/retrieval/retention passes, and completed with a learning-evidence summary.

**Work:** Add a session state machine that owns queue, cursor, pass, committed response IDs, covered objectives, recovery queue, and completion summary. Persist enough state to resume without replaying committed answers. Abandoned/interrupted sessions retain response evidence but are not counted as completed.

**Exit checks:** State transitions reject invalid actions; resume continues at the correct unanswered item; repeated calls cannot duplicate a response event; completion reflects errors, uncertainty, coverage, and next review windows rather than question count alone.

### Milestone 6: Minimal Study experience

**Shippable result:** A student can open a course-scoped or general learning session in the existing Study surface, answer a question, see appropriate feedback, and complete or pause a session.

**Work:** Add focused UI for prompt/options, answer commitment, confidence selection/gesture, immediate correctness feedback, conditional explanation, progress/pass state, pause/resume, and completion summary. Keep presentation in the UI layer; call the engine adapter for all learning decisions. Provide accessible keyboard and screen-reader operation, including an alternative to double-click certainty.

**Exit checks:** Answers and explanations are not exposed before commitment; confidence is captured on commit; multiple-answer response applies to the complete set; empty/error/offline states are understandable; no learning event changes academic grades.

### Milestone 7: User-scoped persistence, synchronization, and backup

**Shippable result:** Learning content and progress survive reloads, account changes, offline use, cloud synchronization, backup/restore, and reset without cross-user leakage.

**Work:** Add dedicated versioned learning storage key(s) to `GradeQuestStorage.USER_KEYS`; hydrate/clear them with the authenticated user's application state; include them in the existing snapshot path and backup export/import; validate and migrate learning records on restore. Choose a bounded event-history/compaction policy before enabling cloud sync because the current Firestore path stores all user data in one `appData` document and local storage rewrites serialized values. Preserve unrelated data when learning data is invalid.

**Exit checks:** Two-user switching never displays or writes another user's learning state; local operation works without connectivity and later uses existing sync; old backups without learning data still restore; invalid learning data cannot corrupt other app data; reset removes learning state; schema migrations are tested.

### Milestone 8: Learning analytics and workspace integration

**Shippable result:** Study/Progress and course context expose evidence-backed review status and trends without replacing existing study or flashcard behavior.

**Work:** Add derived analytics for delayed and first-attempt accuracy, mastery distribution/trend, confidence outcomes/calibration, due/overdue/lapsed reviews, recovery, objective coverage, and meaningful time windows. Integrate course IDs/objectives with course views and add a due-review entry point in Study or Today. Make any search integration opt-in and ensure search does not reveal answers during retrieval.

**Exit checks:** Metrics distinguish activity from learning, suppress or qualify small-sample conclusions, show provenance/windows, and never present one composite learning score or student ranking. Existing flashcard scheduling, study-session totals, and Progress metrics remain unchanged.

### Milestone 9: Hardening and controlled rollout

**Shippable result:** The feature is ready for broader use with regression coverage, documented behavior, and a safe way to disable or recover from storage/logic issues.

**Work:** Complete cross-browser and accessibility checks, performance/large-history checks, offline and sync conflict testing, migration/backup recovery testing, and security review of rendered content. Add a release toggle or equivalent staged enablement if supported by the product. Update user-facing and developer documentation, deployment asset handling, and service-worker cache/version behavior for new modules.

**Exit checks:** Required gates pass; old application data remains readable; failures are surfaced without discarding records; service-worker updates load the matching module set; feature can be disabled without deleting learning history.

## Required Files and Modules

Paths below are planned locations, not existing files unless identified as reuse points.

| Path | Responsibility |
| --- | --- |
| `js/learning/` (new directory) | Student adaptive learning subsystem, separate from PDF import-learning tools. |
| `js/learning/questionRepository.js` | Validate, normalize, query, activate, and retire question records. |
| `js/learning/objectiveCatalog.js` | Objective records, course associations, importance, and question relationships. |
| `js/learning/responseEvaluator.js` | Normalize committed answers and evaluate full single-/multiple-answer responses. |
| `js/learning/masteryEvaluator.js` | Pure mastery transition, decay inputs, delayed bonus, band, and calibration updates. |
| `js/learning/reviewPlanner.js` | Next review dates, interval progression, and recovery sequences. |
| `js/learning/scheduler.js` | Deterministic scoring, balancing, interleaving, and tie-breaking. |
| `js/learning/sessionCoordinator.js` | Session state machine and learning/retrieval/retention passes. |
| `js/learning/analytics.js` | Derived read models with explicit windows and evidence provenance. |
| `js/learning/learningEngine.js` | Narrow adapter/facade used by UI and storage integration. |
| `js/learning/schema.js` | Schema version, validation, defaults, and migrations for persisted learning state. |
| `js/learning/tests/` (new) | Node built-in test modules for pure domain behavior and state transitions. |
| `js/learning/fixtures/` (new) | Small deterministic question/objective fixtures for tests and initial demonstration content. |
| `index.html` | Add Study/course-workspace entry point and load modules in a compatible order. |
| `js/script.js` | Hydrate/clear learning state, snapshot integration, and backup/restore integration. Keep UI/domain rules out of this file. |
| `js/productivity.js` | Add Study/Progress/dashboard entry points only; do not merge flashcard behavior with learning mastery. |
| `js/userStorage.js` | Register dedicated user-scoped learning key(s) so snapshot and reset include them. |
| `css/style.css` | Learning question, feedback, confidence, session, and analytics presentation. |
| `sw.js` | Add new required/cached learning assets and maintain cache versioning as needed. |
| `package.json` | Add a no-dependency test script using Node's built-in test runner; add no runtime dependency unless implementation evidence requires it. |
| `LEARNING_ENGINE_ARCHITECTURE.md` | Update only where resolved implementation decisions differ from or refine the architecture. |
| `DESIGN_DOCUMENT.md` | Update only for product decisions resolved during implementation, preserving it as behavior source of truth. |

## Existing Code to Reuse

- `GradeQuestStorage` in `js/userStorage.js`: UID-scoped keys, JSON helpers, change events, active-user handling, and user reset inventory.
- `getGradeQuestDataSnapshot()` / `applyGradeQuestDataSnapshot()` in `js/script.js`, plus `js/firebase/authGate.js` and `js/firebase/cloudDataService.js`: existing one-document snapshot synchronization. Learning state should use this path rather than direct Firestore writes.
- `hydrateUserData()` and `clearUserDataState()` in `js/script.js`, and `hydrateProductivityData()` / `clearProductivityDataState()` in `js/productivity.js`: user activation/deactivation lifecycle hooks.
- The existing Study navigation, study-session records, Focus Mode, course IDs, course workspace, and Progress surface: context and entry points only. Timer duration is not mastery evidence.
- `js/ui/feedback.js`: existing toast/confirmation/dialog patterns where appropriate; learning correctness feedback should remain inline with the question.
- Existing `escapeHtml` / `escapeAttr` helpers in `js/productivity.js` may be reused for safe text presentation, while question content should prefer DOM text APIs or a consistently audited renderer.
- `sw.js`, `manifest.json`, and deployment validation scripts: static asset availability and PWA release behavior.
- `pdfImportLearningTest/` is reusable only as a reference for browser-local tooling patterns. Its parser correction memory, training records, and schemas must not be reused for student mastery or response history.
- Existing flashcards are a separate study tool. Do not import their review ratings or intervals as learning-engine evidence.

## New Storage Requirements

- Introduce one or a small number of dedicated user-scoped keys, initially recommended as `learningContent` (questions/objectives) and `learningProgress` (mastery, response events, review state, and sessions). Keep the exact split consistent with the chosen event-retention and snapshot-size policy.
- Persist a schema version and migration path. Keep stable question, objective, session, and response IDs, plus timestamps and source references.
- Preserve immutable response events for all analytics and reproducibility that the product supports. Define event retention/compaction before rollout; do not silently truncate evidence or let unbounded history grow the single Firestore `appData` document indefinitely.
- Persist resumable active-session state and deterministic scheduler inputs/decisions needed to avoid replaying committed responses.
- Store question answer data separately from what the active UI renders before commitment. This is a client-side retrieval guard, not a claim of server-side secrecy.
- Use `GradeQuestStorage` for all user-scoped reads/writes. Local storage remains the offline working store; Firestore synchronization is persistence only and must not influence domain decisions.
- Backup import must validate/migrate learning data independently so invalid learning records do not block restoration of courses, grades, planner data, or flashcards. Older backups without learning keys remain valid.
- User reset and user switching must clear or isolate all learning content/progress according to existing account ownership behavior.

## Integration Requirements

- **Authentication and lifecycle:** load learning state only after `GradeQuestStorage.setActiveUser`; clear in-memory state on sign-out/user change; prevent writes without an active UID.
- **Snapshot sync:** add learning keys to `USER_KEYS`; existing snapshot/apply behavior then carries them through Firebase. Test snapshot application carefully because it emits storage-change events for each key.
- **Study UI:** use the existing Study surface and course context, but keep the learning-session record distinct from timer/study-session records.
- **Courses and objectives:** associate questions/objectives through stable existing course IDs, without changing grade, assessment, or GPA records.
- **Progress and Today:** show due reviews and qualified learning trends; do not imply elapsed time, session completion, or answer count proves mastery.
- **Backup/reset/offline:** include validated versioned records in export/restore, clear with reset, support locally available sessions offline, and sync later using current behavior.
- **Search:** defer until the retrieval flow is established; any indexing must not expose a correct answer or explanation before commitment.
- **PDF and AI systems:** PDF extraction and Ollama are not engine dependencies. A future question generator may propose content through the repository/validation boundary, but generated questions require review/approval and enter at initial mastery 10.
- **PWA/deployment:** ensure all added assets are available in the service-worker shell/cache strategy, update cache identifiers when required, and pass deployment validation.

## Testing Requirements

- **Pure unit tests:** answer normalization; exact multiple-answer matching; confidence capture constraints; mastery deltas/bounds; delayed bonus; decay; calibration; objective aggregation; interval progression; recovery; deterministic score and tie-breaking; analytics windows and sample thresholds.
- **State-machine tests:** valid/invalid session transitions, pass ordering, retry separation, pause/resume, interrupted/abandoned handling, duplicate submission prevention, and completion summaries.
- **Persistence/migration tests:** schema validation, version upgrades, unknown/malformed fields, older backups without learning data, preservation of unrelated backup fields, reset, UID isolation, and snapshot round trips.
- **Browser integration tests:** question UI does not reveal answer/explanation before commit; confidence is captured before feedback; session state renders through learning/retrieval/retention passes; offline reload and later sync do not duplicate response events.
- **Regression tests:** no changes to grade calculations, assessments, course CRUD, study timers, flashcard intervals, or PDF-import learning records.
- **Accessibility checks:** full keyboard interaction including confidence choice, focus management, semantic feedback announcements, contrast, and reduced-motion compatibility for any added transitions.
- **Release checks:** `npm test`, `npm run validate:deployment`, manual multi-user/offline/restore checks, and a service-worker update check. The repository currently has no established automated browser E2E framework; browser automation should be added only if a maintained project-level tool is selected.

## Risks and Mitigations

| Risk | Mitigation / decision needed |
| --- | --- |
| Mastery, decay, objective aggregation, and delayed bonuses are specified partly as recommendations rather than complete formulas. | Resolve and document exact deterministic formulas in Milestone 1; test boundaries and invariants before storing results. |
| A single Firestore `appData` document and local storage can grow with response events and question content. | Define event retention/compaction and content-size limits before rollout; monitor serialized size and design a future storage migration threshold. Do not introduce Firestore subcollections in the MVP without a separate migration/sync design. |
| Existing global scripts create implicit ordering and cross-module coupling. | Keep the engine in isolated ES modules with pure domain APIs; expose one small adapter to the existing UI and test script loading in the static app. |
| Backup import is currently permissive and unversioned. | Version only the learning payload initially; validate it separately and preserve backward compatibility with backups lacking the new fields. Avoid broad backup-format refactoring unless needed for safe learning-data restore. |
| Cloud snapshot application writes storage keys and emits change events, which may schedule cloud saves while a snapshot is being applied. | Test snapshot round trips and sync debounce behavior with learning keys; avoid introducing direct learning-specific Firebase paths. |
| Question content can contain unsafe or misleading HTML, ambiguous answers, or incorrect generated material. | Render untrusted text safely; validate completeness/source references; keep generated content out of the schedulable catalog until reviewed and approved. |
| Double-click confidence can be inaccessible or unreliable on touch devices. | Provide an explicit accessible confidence control; treat double-click as optional input, never the only route to certainty. |
| Session performance may degrade if every response serializes an unbounded state object. | Measure realistic histories, bound retained history as decided, and avoid recomputing all analytics synchronously on each answer. |
| Analytics can overstate learning from small samples or activity metrics. | Gate conclusions by meaningful sample windows, show provenance, and distinguish process metrics from delayed retrieval evidence. |
| Service worker may fail or serve mixed versions when required assets change. | Add cache/version checks to release validation and keep a rollback path that preserves user records. |
| Initial question authoring may be a product bottleneck. | Ship with manually reviewed fixtures/content workflow; treat AI generation as optional and independent from deterministic learning behavior. |

## Dependencies

- **Required runtime:** supported browser APIs already used by Grade Quest (`localStorage`, DOM, events, and service worker where available); authenticated UID for user-scoped persistence.
- **Required application modules:** `GradeQuestStorage`, the existing hydration/snapshot lifecycle, Study/course UI surfaces, and static script/service-worker loading.
- **Required development runtime:** Node.js for the existing package scripts and the built-in `node:test` runner; no new third-party runtime package is required for the deterministic core.
- **Required product inputs:** approved question/objective content with complete answer definitions, explanations, stable course/objective references, and source provenance where available.
- **Required decisions before persistence:** exact deterministic formulas, supported question types for MVP, event-retention/compaction policy, migration behavior, and snapshot size limits.
- **Not required:** React, a bundler, an application server, Firebase changes, Ollama, a hosted model, or model-training service. Future AI question generation is an optional producer behind validation and approval, not a core dependency.