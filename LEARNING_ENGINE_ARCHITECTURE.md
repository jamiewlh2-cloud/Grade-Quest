# Grade Quest Learning Engine Architecture

**Status:** Architecture specification
**Source of truth:** `DESIGN_DOCUMENT.md`
**Scope:** Deterministic adaptive learning after study material has been converted into questions

## 1. Major Components

The learning engine is a browser-side, deterministic subsystem that fits inside the existing static Grade Quest application. It must not require a frontend framework, application server, or model service for its core behaviour. The same persisted inputs must produce the same question ordering and state transitions.

### Question repository

Stores the normalized questions available for learning. A question may belong to one or more courses and learning objectives. The repository provides questions by stable ID, objective, question type, and equivalent or related-question relationship.

It must preserve enough content to support independent retrieval, immediate correctness feedback, explanations, and application/context variations. It must distinguish answer data from feedback data so the answer or explanation is not exposed before commitment.

### Objective catalog

Stores learning objectives and their relationships to courses and questions. Objective mastery is derived from related question evidence; it is not a replacement for question-level records.

### Response recorder

Creates an immutable retrieval event for every committed answer, including confidence captured before correctness is revealed. It handles single-answer, multiple-answer, uncertain, timeout, and no-response outcomes according to the question definition.

### Mastery evaluator

Updates question-concept mastery from response events, prior mastery, confidence, correctness, and elapsed time. It applies the deterministic changes and bounds defined in the design document, including delayed-retrieval bonuses and gradual decay.

### Confidence and calibration evaluator

Records the behavioural confidence category and compares it with correctness over time. It identifies calibrated confidence, overconfidence, underconfidence, and cautious incorrect responses without treating confidence as an academic grade.

### Scheduler

Builds a deterministic ordered queue from due and overdue state, mastery, recent errors, repeated-error and overconfidence flags, objective importance, elapsed time, and current-session coverage. Stable tie-breaking is required.

### Session coordinator

Owns the session state machine and the bounded queue for one study session. It coordinates learning, retrieval, and retention passes, delayed retries, feedback, explanations, and completion summaries.

### Review planner

Calculates the next review window from response outcome, mastery state, confidence evidence, repeated errors, and the interval sequence. It creates recovery sequences when the design requires prerequisite recall, explanation, related example, and delayed retry.

### Analytics aggregator

Derives question, objective, session, review-adherence, retention, and calibration metrics from response and scheduling history. It must distinguish process measures from learning measures and avoid a single definitive learning score.

### Learning engine adapter

Provides the narrow boundary used by Grade Quest screens and persistence. It should expose operations for loading state, starting a session, submitting a response, requesting feedback, advancing the session, completing a session, and reading analytics. Rendering remains owned by the existing application UI layer.

## 2. Required Data Structures

The structures below describe the required persisted and runtime records. Field names are logical names; implementation may use the repository's existing naming conventions.

### Question

- `questionId`: stable identifier.
- `conceptId`: concept represented by the question-concept pair.
- `courseId`: associated Grade Quest course, when applicable.
- `objectiveIds`: one or more learning objective IDs.
- `type`: single-answer, multiple-answer, or another explicitly supported type.
- `prompt`: retrieval prompt.
- `options`: answer options when applicable.
- `correctAnswer`: complete answer representation, kept separate from the prompt.
- `explanation`: rationale and relevant distinction.
- `applicationLevel`: recognition, direct retrieval, comparison, or application.
- `relatedQuestionIds`: simpler, equivalent, or differently worded questions.
- `sourceReference`: source material reference when available.
- `active`: whether the question can be scheduled.

### Learning objective

- `objectiveId`: stable identifier.
- `courseId`: associated course.
- `title` and optional description.
- `importance`: scheduling weight supplied by the learning content or product configuration.
- `questionIds`: related question IDs, or a queryable relationship.

### Question-concept mastery record

Mastery is attached to the question-concept pair, not permanently to the student or to one wording.

- `questionId` and `conceptId`.
- `mastery`: integer or numeric value bounded from 0 to 100; new records begin at 10.
- `masteryBand`: unfamiliar, developing, functional, strong, or maintained.
- `lastAttemptAt` and `lastSuccessfulRetrievalAt`.
- `lastScheduledAt`, `nextReviewAt`, and `lastDueAt`.
- `reviewStage`: acquisition, active review, or maintenance.
- `intervalDays` and the current interval position.
- `attemptCount`, `correctCount`, and `incorrectCount`.
- `recentOutcomeHistory`: bounded recent event references or summaries.
- `consecutiveErrors` and recent-session error count.
- `delayedRetrievalCount` and delayed-correct count.
- `uncertainCorrectCount`, `certainCorrectCount`, and `certainIncorrectCount`.
- `overconfidenceFlag`, `underconfidenceFlag`, and `guessingSignal` where supported by observed patterns.
- `recoveryState`: none, explanation-needed, related-question, or delayed-retry.

### Retrieval response event

Events are append-only evidence. They must preserve the state needed to reproduce mastery, calibration, scheduling, and analytics decisions.

- `responseId`, `sessionId`, `questionId`, `conceptId`, and `objectiveIds`.
- `presentedAt`, `committedAt`, and optional response duration only if deliberately adopted as a signal.
- `response`: the selected or entered complete response.
- `confidence`: uncertain, standard, or certain.
- `confidenceCapturedAt`: must precede correctness feedback.
- `correct`: final evaluated correctness.
- `outcome`: correct, incorrect, timeout, or no-response.
- `wasDue`, `wasOverdue`, and `delayDays` at commitment.
- `masteryBefore`, `masteryDelta`, and `masteryAfter`.
- `delayedBonus` when applicable.
- `calibrationResult`: calibrated, overconfident, underconfident, or appropriately cautious.
- `feedbackShown`, `explanationShown`, and `nextReviewAt`.

For multiple-answer questions, `response` and `correct` apply to the complete set. Partial or extra selections are incorrect unless the question explicitly defines partial credit.

### Session record

- `sessionId`, `courseIds`, and selected `objectiveIds`.
- `startedAt`, `completedAt`, and session status: planned, active, paused, completed, abandoned, or interrupted.
- `plannedQuestionIds` and ordered exposure records.
- `currentPass`: learning, retrieval, or retention.
- `currentQuestionId` and cursor state for resumable sessions.
- `learningPassResponseIds`, `retrievalPassResponseIds`, and `retentionPassResponseIds`.
- `coveredObjectiveIds`.
- `errorQuestionIds`, `uncertainQuestionIds`, and questions requiring recovery.
- `summary`: counts and derived learning evidence, not only activity totals.

### Review schedule entry

- `questionId`, `conceptId`, and `objectiveIds`.
- `dueAt`, `scheduledAt`, `intervalDays`, and review stage.
- `reason`: new, due, overdue, weak, recent error, repeated error, overconfidence, uncertain success, delayed confirmation, or maintenance.
- `priorityInputs`: the deterministic need, urgency, risk, and coverage inputs used for ordering.
- `recoveryStep` when part of a recovery sequence.

### Analytics read model

Analytics may be computed from records or maintained as a derived view. It must include metric provenance and time windows so short sessions do not appear definitive.

- Accuracy and delayed accuracy by question, objective, course, and time window.
- Mastery distribution and objective mastery trend.
- Confidence outcome counts and confidence accuracy gap.
- Due, overdue, maintained, lapsed, and missed-review counts.
- Error recurrence, recovery status, and reviews to stable mastery.
- Session objective coverage and explanation-to-retrieval ratio.

## 3. Question Lifecycle

1. **Imported or authored:** material is converted into a normalized question with a stable ID, concept, objective links, answer definition, explanation, and optional related variants.
2. **Validated:** answer completeness, question type, objective links, and feedback content are checked before scheduling.
3. **Available:** the question can be selected as new learning. No reading or import event establishes mastery.
4. **Presented:** the question is shown for independent retrieval. The answer and explanation remain unrevealed.
5. **Committed:** the response and confidence are recorded before correctness feedback.
6. **Evaluated:** correctness, confidence calibration, mastery delta, delayed bonus, and next review are determined.
7. **Recovered or reinforced:** feedback, explanation, related question, or delayed retry is selected according to the outcome and history.
8. **Scheduled:** the question enters the next interval or an earlier recovery window.
9. **Maintained or lapsed:** successful delayed retrieval moves it through increasing intervals; errors, uncertainty, or missed reviews shorten the interval and may lower mastery.
10. **Retired:** only deactivation of the source question or objective removes it from normal selection. Historical response and mastery evidence remain available for analytics.

## 4. Mastery Lifecycle

Mastery begins at 10 and is bounded from 0 to 100. The evaluator applies the design document's normal-question changes:

| Response | Mastery change |
| --- | ---: |
| Correct, uncertain | +4 |
| Correct, standard | +8 |
| Correct, certain | +12 |
| Incorrect, uncertain | -8 |
| Incorrect, standard | -10 |
| Incorrect, certain | -18 |
| No response or timeout | -12 |

Positive changes become smaller at high mastery and negative changes are softened at low mastery. A correct response after the scheduled date may receive a capped bonus of up to 4 points based on delay. The evaluator must not reward intentionally missing reviews.

The lifecycle is:

1. **Unfamiliar:** initial exposure and low evidence.
2. **Developing:** some correct retrieval, but unreliable, uncertain, recent, or not yet delayed.
3. **Functional:** usually correct under ordinary conditions.
4. **Strong:** reliable across delays and confidence levels.
5. **Maintained:** currently strong and still eligible for spaced checks.
6. **Lapse or recovery:** an error, missed response, repeated error, or calibration failure lowers mastery and returns the question to an earlier review cycle without erasing all evidence.

Question mastery must not reach the maintained band through uncertain correct answers alone. Stable mastery requires recent correct retrieval, delayed correct retrieval, at least one successful high-confidence retrieval, no unresolved repeated-error pattern, and reasonably aligned confidence.

Objective mastery is a derived aggregation across related questions. It must give more weight to delayed retrieval, application questions, recent independent retrieval, and correct high-confidence answers. One strong wording must not hide weak related questions, and an objective is not mastered while a high-priority weak question remains unresolved.

## 5. Confidence Lifecycle

Confidence is captured at commitment and cannot be upgraded after feedback.

1. **Uncertain:** explicit uncertainty or hesitation. Correct responses provide emerging-knowledge evidence with a reduced mastery increase; incorrect responses receive normal correction.
2. **Standard:** ordinary single-click commitment. It receives the standard mastery effect and is neither treated as low confidence nor as failure.
3. **Certain:** double-click on the same answer before commitment. Correct responses strongly support mastery; incorrect responses produce the largest normal correction and an overconfidence signal.
4. **Calibrated or mismatched:** after correctness is known, the event is classified as certain-correct, certain-incorrect, uncertain-correct, or uncertain-incorrect.
5. **Trend:** repeated outcomes update objective and question calibration evidence. Persistent certain-incorrect outcomes trigger earlier review and a recovery path; persistent uncertain-correct outcomes indicate underconfidence or fragile retrieval and keep the question active.
6. **Recalibration:** after an overconfidence event, a later correct standard-confidence response is required before another certain response can count as evidence of stable mastery.

Confidence affects mastery evidence and scheduling, not the student's academic grade. The interface should communicate mismatch neutrally and should never penalize honest uncertainty by treating it as failure.

## 6. Session Lifecycle

### Planned

The coordinator identifies due, overdue, weak, recent-error, and new questions; ranks them deterministically; selects a bounded set; balances objective coverage; and explains whether the emphasis is review, recovery, or new learning. Due and recently weak questions establish context before new material.

### Active

The coordinator presents one question at a time. For each question it records the response and confidence, reveals correctness, shows explanation when required, updates mastery and calibration, schedules the next review, and selects the next question. The active queue alternates objectives and difficulty where the available question set permits.

### Paused or interrupted

The current cursor, pass, planned queue, and completed response IDs are persisted so the session can resume without replaying committed responses. An abandoned session retains its response evidence but does not claim completion.

### Retrieval pass

Questions missed during the learning pass return only after intervening questions. The previous answer and explanation are not shown first.

### Retention pass

Selected previously mastered questions are mixed into the closing portion of the session to test independent recall and delayed confirmation. A session must not end as an uninterrupted block of new material.

### Completed

Completion records questions answered, objectives covered, correctness and calibration, improvements, unstable or due questions, recovery work, and the next review window. It must not imply that all material is mastered.

## 7. Review Lifecycle

### Selection

Eligible questions are ranked by, in order: due or overdue status, low mastery, recent incorrect responses, repeated errors or overconfidence, objective importance, time since last seen, and balanced objective coverage. The deterministic score combines need, urgency, risk, and coverage. Ties resolve by oldest due date, weakest mastery, then stable question order.

New questions are used when urgent review is unavailable or broader coverage is needed. Equivalent questions should vary wording or application context. Repeatedly failed questions are separated by a related question, explanation review, or short retrieval break.

### Interval progression

Successful retention follows the sequence of approximately 1 day, 3 days, 7 days, 14 days, 30 days, and 45-60 days for maintenance. A question returns earlier after an error, uncertainty, confidence-calibration failure, or missed review. Mastered questions remain eligible for maintenance checks.

### Feedback and explanation

Correctness feedback is immediate. Wrong answers, certain wrong answers, invalid or incomplete multiple-answer responses, and correct uncertain answers with a high error history receive explanation as specified by the design. Explanation supports recovery but does not establish mastery; a later retrieval event is required.

### Recovery

After two errors on the same question in one session, the engine stops immediate repetition, shows the explanation and distinction, presents a simpler or related question, and returns later. After three errors across recent sessions, it schedules prerequisite recall, explanation, related example, and delayed retry. Guessing signals reduce mastery credit and bring a differently formed question forward.

### Review outcomes

Every review resolves to one of: mastered for now, developing and scheduled soon, needs explanation and later retry, or misconception/overconfidence risk requiring targeted review. Outcome selection considers history and calibration, not only the latest correctness value.

## 8. Analytics Requirements

Analytics are derived from response, mastery, session, and schedule records. They must use meaningful sample sizes and time windows, avoid overreacting to one session, and clearly distinguish activity from learning.

### Required learning metrics

- First-attempt accuracy and delayed-review accuracy.
- Accuracy by question, objective, course, and application level.
- Current mastery by question and objective.
- Questions due, overdue, maintained, lapsed, and missed.
- Error recurrence and reviews required before stable mastery.
- Retention after approximately one day, one week, and one month.
- Session coverage across objectives.
- Explanation-to-retrieval ratio.
- Review adherence and missed-review count.
- Mastered questions that later lapsed.

### Required confidence metrics

- Certain-correct, certain-incorrect, uncertain-correct, and uncertain-incorrect rates.
- Confidence accuracy gap over a meaningful sample.
- Calibration trend over time.
- Objectives with persistent overconfidence or underconfidence.

### Required mastery trends

- Objective mastery growth over time.
- Movement from developing to functional or strong mastery.
- Movement from maintained back to developing.
- Mastery supported by delayed retrieval versus immediate practice.
- Recent weak concepts and recovery status.
- Stability after errors.

The UI should present which objectives are stable, fragile, or due for a particular review type. It must not rank students, compare students, or present a single composite score as the complete state of learning. Time, question count, and completed sessions are process metrics, not proof of learning.

## 9. Integration Points With Existing Grade Quest Systems

### Application shell and UI

The engine should be exposed through the existing Study and course-workspace surfaces in `index.html`, with rendering and interaction conventions consistent with the current vanilla JavaScript application. The engine owns learning state and decisions; UI code owns presentation, navigation, and feedback display.

### Courses and academic context

Questions and objectives may reference existing course IDs and course metadata. Course context supports filtering, objective coverage, importance, and course-level analytics without changing grade calculations or assessment records.

### Study sessions and timers

The existing study-session and focus-mode features provide activity/timer context. A learning session should remain a distinct record because elapsed study time does not establish mastery. The engine may associate a learning session with a study session or course, but must preserve its own question, response, pass, and review state.

### Flashcards

Flashcards already have their own storage and interval behaviour in `js/productivity.js`. The learning engine should not reinterpret flashcard ratings as question-concept mastery or silently replace the existing flashcard scheduler. A future explicit bridge may relate a flashcard to a question or objective, but the design document's response, confidence, and mastery rules remain authoritative for learning questions.

### User-scoped storage

Learning state must use `GradeQuestStorage` and authenticated user-scoped keys. A dedicated learning-state record or a small set of dedicated records should be added to the existing `USER_KEYS` inventory. The record must include a schema version and support migration because current application backups do not define a schema version.

At minimum, persistence must cover question content or references, objectives, mastery records, response events or the retained event history required by analytics, session state, review schedule, and analytics metadata. All writes should emit the existing `gradequest:data-changed` event through the storage abstraction.

### Firebase synchronization

The existing `authGate.js` and `cloudDataService.js` load and save one user `appData` snapshot. Learning data should participate in that snapshot through the existing application data snapshot functions. It must remain user-scoped, survive auth changes correctly, and tolerate offline operation through local storage; cloud synchronization is persistence, not a learning decision-maker.

### Backup, restore, and reset

Learning records must be included in application export/import and cleared by the existing user reset flow. Restore must validate the learning-state schema and preserve stable IDs and timestamps. Invalid or incomplete learning data must not corrupt unrelated courses, grades, planner, or flashcard data.

### Progress and search

Progress views may consume the analytics read model for learning trends. Global search may index question prompts, objectives, and explanations only as appropriate for the current search context; search results must not reveal an answer in a way that bypasses a retrieval session.

### Offline and PWA operation

The deterministic engine should work when the application shell and learning data are locally available. Service-worker caching may support assets, while queued local changes rely on the existing snapshot synchronization path when connectivity returns.

### Existing PDF/import learning tools

The `pdfImportLearningTest` tools learn parser corrections and extraction patterns. They are not the student adaptive learning engine. Imported assessment data may provide course context, but parser-training records and student learning records must remain separate concerns and separate schemas.

## 10. Future AI Question Generation Integration

AI question generation is an optional producer behind the question repository boundary. It must not replace deterministic scheduling, confidence capture, mastery evaluation, calibration evaluation, review intervals, or analytics.

### Generation flow

1. A course resource, outline, note, or approved source passage is selected.
2. A generator proposes questions, answer definitions, objective links, explanations, question type, application level, and source references.
3. Deterministic validation checks structure, answer completeness, objective linkage, duplicate or equivalent wording, and source traceability.
4. A review workflow approves, edits, or rejects each proposal before it becomes available to students.
5. Approved questions receive stable IDs and enter the repository as new questions with mastery 10.
6. The normal response, mastery, confidence, scheduling, review, and analytics lifecycles apply unchanged.

The current optional Ollama integration is used by the PDF assessment importer and should not be assumed to be a learning-engine dependency. Any future generator should use an adapter so the core engine remains usable without a model, remains deterministic after question approval, and can record generator metadata without treating model output as learning evidence.

### Required provenance and safety data

Generated questions should retain source reference, generator/provider, model identifier when applicable, generation timestamp, prompt or generation version where policy permits, validation result, reviewer decision, and revision history. Generated content must not be scheduled until it passes the same validation and approval boundary as authored content.

### AI limitations

AI output may contain incorrect answers, ambiguous wording, unsupported claims, or duplicate questions. The architecture therefore treats AI as a content proposal mechanism only. Correctness, confidence, mastery, and retention are established exclusively by the student's observed retrieval events and the deterministic rules in `DESIGN_DOCUMENT.md`.