# Question Generation Implementation Plan

**Status:** Implementation plan for the approved question-generation architecture
**Scope:** Begin proposal generation and integrate it safely with the existing document and learning systems
**Related sources:** `TEAM_CONTEXT.md`, `PROJECT_AUDIT.md`, `STUDY_PLAN_CREATION_ARCHITECTURE.md`, `QUESTION_GENERATION_ARCHITECTURE.md`, and `LEARNING_ENGINE_ARCHITECTURE.md`

## Current Decision

The smallest safe milestone that begins question proposal generation is a pure, testable proposal-generation slice over the existing extracted-PDF document shape. It should create narrowly scoped, source-referenced, plan-bound proposals and leave them outside the active question repository. A deterministic rule may be used only for content with an explicit structure, such as a term-definition entry; this is a limited baseline, not a claim that rules alone meet the product's quality goal.

Do not begin with a new PDF parser, an AI prompt, a new file format, or a review interface. First prove that source blocks can produce valid proposal records without crossing the approval boundary. Subsequent milestones add persistence, optional AI, and the user review path.

## 1. Current Reusable Systems

| Existing system | Reuse for question generation | Current boundary or limitation |
| --- | --- | --- |
| `PDFReader.extractDocument()` and `PDFDocumentBuilder` | Input to the PDF proposal path. The extracted document includes normalized text, paragraphs, page/line metadata, and heuristic sections. | Section headings are inferred heuristically; they are not verified semantic topics or objectives. |
| `PDFImportSharedPipeline.extractImportDocument()` | Shared file extraction entry point for PDF import. `pdfImportLearningTest/learningImporter.js` already demonstrates another feature consuming this extraction boundary. | It is a browser-global interface around PDF/OCR, not a generic DOCX/PPTX/TXT adapter API yet. |
| `OCRProcessor` | Reuse the current scanned-PDF fallback where applicable. | OCR currently runs only when the PDF text extraction has no usable text and returns plain text; mixed scanned/text pages and general image OCR are not solved. |
| StudyPlan domain and versioned learning state | Require an existing `studyPlanId` and parent-course consistency for proposal ownership. Reuse the existing plan-scoped persistence and ownership conventions. | `learningState` currently models active learning records, not a proposal/review lifecycle. |
| `normalizeQuestion()`, `createQuestionRepository()`, and `createObjectiveCatalog()` | Use at explicit approval to validate and register supported active questions/objectives. | `normalizeQuestion()` defaults `active` to true, and the repository returns active questions to schedulers. Drafts must not be registered here. |
| Existing question/session behavior | Preserve current question response types and deterministic learning behavior after approval. | Generation must not add unsupported answer mechanics or alter mastery, confidence, scheduling, or sessions. |
| `GradeQuestStorage` and user snapshot synchronization | Reuse authenticated user scoping, change events, cloud snapshots, reset behavior, and backup conventions for persisted proposals. | The snapshot enumerates `USER_KEYS`; backup export/import has explicit field handling. New durable data must participate in both paths and be validated on restore. |
| Node's built-in test runner | Add proposal unit and integration tests alongside the learning tests. `npm test` runs `node --test`. | There is no browser end-to-end test suite. Keep the core generator independent of browser globals so it is straightforward to test. |

## 2. Existing Parser Reuse Opportunities

Reuse **extraction**, not syllabus interpretation:

- Call the established shared PDF extraction path and consume its document/paragraph structure and locations. Preserve page, line, paragraph, and section references through segmentation and proposal creation.
- Reuse PDF.js, `PDFDocumentBuilder`, and existing OCR behavior rather than implementing another PDF decoder or OCR pipeline.
- Treat inferred sections as navigational hints only. Their current heading heuristic contains syllabus-oriented signals and does not establish that a section is a learning objective.
- Reuse the assessment preview's human-review principle, not its assessment row schema or modal as a question-review system.

Do **not** reuse `AssignmentParser`, course/date/weight parsers, `ImportValidator`, assessment confidence thresholds, assessment merging, `runHybridAssessmentPipeline()`, or the assessment-specific Ollama prompt as question-generation logic. They interpret graded assessments, not concepts, answers, or pedagogical quality. The parser-correction and training data under `pdfImportLearningTest/` is not student question or mastery data.

The existing PDF importer calls OCR only when the entire extracted document has no usable text. Initial proposal generation should report this limitation; improving mixed-page OCR is a separate extraction milestone, not a reason to fork PDF parsing.

## 3. Required New Modules

Keep the first change in the learning domain and consume an extracted document through an input contract. Names below are proposed module responsibilities, not a requirement to add every module in the first milestone.

| Module responsibility | Purpose | Needed when |
| --- | --- | --- |
| Proposal schema and validator (`js/learning/questionProposalSchema.js`) | Define proposal identity, `studyPlanId`, source references, provenance, review status, and required candidate fields. Reject unknown plans and malformed records without applying active-question defaults. | First milestone |
| Pure generator (`js/learning/questionGenerator.js`) | Accept selected extracted blocks, a target plan, and generation options; return proposals and diagnostics without mutating the catalog or persistence. Start with a narrow explicit-content rule and a provider-neutral result contract. | First milestone |
| Proposal repository/store (`js/learning/questionProposalRepository.js`) | Query and update proposal banks by StudyPlan, preserve review decisions, and persist them separately from active questions. Validate user scope and status transitions. | Persistence/review milestone |
| Approval boundary (`js/learning/questionProposalApproval.js`) | Convert only explicitly approved, complete proposals into catalog question/objective records; validate plan ownership and supported response types before registration. | Review/approval milestone |
| Optional provider adapter (for example, `js/learning/questionGenerationProvider.js`) | Isolate provider request/response normalization, model metadata, failure handling, and privacy/cost policy from the generator and learning engine. | AI milestone only |
| Format adapters for DOCX, PPTX, and TXT | Return the shared canonical document structure and source locations. | Separate format-support milestones; not needed to begin PDF proposal generation |

The first slice does not need an AI provider module, a generalized OCR module, new format adapters, or UI components. Avoid adding a generic framework until a second provider or format demonstrates that the abstraction is needed.

## 4. Development Milestones

### Milestone 1: Isolated PDF Proposal Core

**Purpose:** Prove the first generation path while establishing the proposal/active-catalog boundary.

**Scope:** A pure generator consumes the existing extracted-document shape and an explicit target `studyPlanId`. It emits a small, bounded set of proposals only from source patterns that support a defensible transformation, such as explicit term-definition entries. Each proposal carries source locations, generator provenance, and a pending-review status. The proposal validator does not normalize proposals as active questions. No persistence, AI call, new parser, new file format, or review UI is included.

**Exit criteria:** Fixtures demonstrate useful proposals from supported source patterns, no proposal from unsupported/ambiguous patterns, valid source references, and rejection of missing plan context. Tests prove generation has no side effect on the question repository, scheduler, mastery, or sessions. A zero-proposal result is valid and must not be filled with invented content.

This milestone is intentionally narrow. Its rule-based output is a proof of the proposal pipeline, not the final generation strategy or evidence that rule-only generation is sufficient.

### Milestone 2: Durable Proposal Banks

**Purpose:** Let users retain pending proposals and review state without putting drafts in the active learning catalog.

**Scope:** Add plan-scoped proposal-bank persistence, schema validation, user switching, snapshot synchronization, reset, and backup/restore coverage. Keep proposal records distinct from `learningState.questions` and from `createQuestionRepository()`. A dedicated user-scoped `questionProposals` storage record is the lowest-coupling starting point; if proposals are instead added to `learningState`, that requires an explicit schema-version migration and validation rules before use.

**Exit criteria:** Proposals round-trip for the owning user and target plan; sibling plans remain isolated; invalid or cross-course records are rejected; old backups without proposal data still restore; malformed proposal data cannot discard valid active learning records; pending items remain absent from schedulable question queries.

### Milestone 3: Review and Explicit Approval

**Purpose:** Make proposal curation the sole route into the active catalog.

**Scope:** Provide proposal review, editing, deferral, rejection, and per-question approval using the existing application UI conventions. Approval validates required question fields, objective references, supported response mechanics, and `studyPlanId`, then passes finalized content through the existing question/objective contracts. Approval initializes only the engine's normal new-question state; it creates no response evidence.

**Exit criteria:** Rejected, deferred, malformed, and unreviewed proposals cannot be scheduled. An explicitly approved question becomes available only in its target StudyPlan. Duplicate content copied to another plan receives independent identities and progress. Review edits and decisions survive reload and backup/restore.

### Milestone 4: Optional AI Provider

**Purpose:** Add contextual question drafting without making generation or learning dependent on AI.

**Scope:** Implement a provider adapter behind the generator contract. Send only user-selected, bounded source material; normalize structured output; attach model/provider and source provenance; validate deterministically; and save all generated output as proposals. Treat local Ollama as a possible provider only after confirming availability and question-generation behavior; do not call or generalize the existing assessment-specific endpoint/prompt. A hosted provider requires a secure service boundary and explicit privacy, consent, and cost decisions because the current application is a static client with no inference service.

**Exit criteria:** Provider errors, malformed output, missing configuration, and offline use leave existing proposals and active questions intact. Mock-provider tests cover valid and invalid responses without network or model dependencies. No generated question can bypass review.

### Milestone 5: Additional Extraction Formats and OCR Coverage

**Purpose:** Expand supported sources while retaining one shared ingestion architecture.

**Scope:** Add DOCX, PPTX, and TXT adapters against the canonical source-block contract, then improve OCR coverage for mixed scanned/text PDFs and future image input as separately bounded work. Preserve document-specific provenance and extraction warnings. Evaluate browser compatibility, dependency size, licensing, CDN/PWA caching, and resource limits.

**Exit criteria:** Each adapter preserves ordering and locations needed by proposals, reports unsupported content, and passes representative extraction fixtures. No format introduces a second PDF pipeline or feature-specific duplicate decoder.

Milestones 2 and 3 should precede enabling AI-generated banks for users: provider output must be durable and reviewable before it is offered as a user workflow. Additional formats are not prerequisites for the first PDF proposal slice.

## 5. Testing Strategy

The existing `npm test` baseline passes 25 Node tests. Extend the built-in `node:test` suite under `js/learning/tests/` for the domain and persistence contracts; keep core generation functions independent from `window`, the DOM, PDF.js globals, and live AI services.

- **Proposal contract tests:** required fields, statuses, stable IDs, source references, provenance, supported question types, and missing/unknown/cross-course StudyPlan rejection.
- **Generator tests:** representative extracted-document fixtures; explicit structures produce candidates; ambiguous or unsupported passages produce none or flagged drafts; every candidate retains valid page/paragraph/block references; output is deterministic for the deterministic baseline.
- **Isolation tests:** pending/rejected/deferred proposals are never registered in the active question repository and never appear in schedulable queries, sessions, mastery records, or analytics. Only explicit approval crosses the boundary.
- **Ownership tests:** each proposal belongs to exactly one existing plan; duplicate content across plans yields independent question identities; no mastery or response state transfers.
- **Persistence tests:** proposal bank round-trip, UID isolation, plan isolation, schema validation, snapshot/cloud data shape, backup/restore, reset, and backwards compatibility with backups that omit proposals.
- **Approval tests:** incomplete questions, unsupported response contracts, missing objectives, and mismatched plans are rejected; valid approved records satisfy existing question and objective catalog validation.
- **Provider tests:** use a fake provider for valid, malformed, duplicate, delayed, and failed responses; test chunk retry/idempotency and ensure no provider/network call is required for manual or deterministic flows.
- **Extraction integration checks:** verify that the existing PDF extraction entry point and its source locations are passed through. Use extraction fixtures or browser-level checks for the PDF.js/OCR boundary; do not duplicate parser tests as generation tests.

The repository does not currently have an end-to-end browser suite. For milestones that add review UI, include focused manual browser verification until automated browser coverage exists; do not treat unit tests as proof of layout or import usability.

## 6. Risks

| Risk | Consequence | Mitigation in the plan |
| --- | --- | --- |
| Existing `normalizeQuestion()` defaults `active` to true. | A draft accidentally passed to the catalog could become schedulable. | Use distinct proposal records and stores; test that only the approval boundary calls the catalog. |
| Current PDF structure is partly heuristic and OCR returns plain text. | Proposals may cite misleading boundaries or source text. | Keep source locations and warnings; constrain first rules to explicit structure; do not claim robust mixed-page OCR. |
| Deterministic starter generation is shallow. | A proof slice could be mistaken for final question quality. | Keep the first milestone narrow and explicitly follow with optional AI and human review; do not market count as quality. |
| Proposal storage is added to versioned learning state without migration. | Existing backups or active learning state may be rejected or lost. | Prefer an isolated validated proposal record initially, or require migration and round-trip tests before changing learning-state shape. |
| Objective/concept candidates do not satisfy the active catalog contract. | Approved question cannot be registered or is attached incorrectly. | Keep proposal fields editable/candidate until approval; require valid plan-owned objectives at activation. |
| Existing Ollama assessment code is reused as question generation. | Wrong prompt/schema, fragile parsing, or misleading hosted availability. | Create a separate provider contract; treat current Ollama behavior as assessment-specific precedent only. |
| AI source transfer is not explicit. | Privacy, consent, cost, or credential exposure. | Make AI opt-in; never embed hosted secrets in the browser; resolve service, retention, consent, and cost before provider rollout. |
| Large documents or banks exceed browser/storage limits. | UI stalls, persistence failures, or oversized Firestore snapshots. | Process bounded chunks, persist incrementally, retain compact provenance, and enforce source/provider limits. |
| Minimal test infrastructure misses browser integration defects. | Review or import flow can fail despite passing domain tests. | Keep core pure and Node-tested; add focused browser verification for UI and actual PDF extraction integration. |

## 7. Integration Points

1. **Shared extraction:** `PDFImportSharedPipeline.extractImportDocument()` is the existing PDF entry point; `PDFReader` and `PDFDocumentBuilder` provide its current structured text. Question generation consumes extracted output, not the assessment pipeline's interpretation.
2. **Learning content:** `js/learning/schema.js`, `questionRepository.js`, and `objectiveCatalog.js` define active content validation and plan-scoped retrieval. Approval must use these contracts; proposals stay separate.
3. **Learning experience:** `js/learning/studyExperience.js` and the existing session coordinator consume active queues. They should see no pending proposal records and require no model integration.
4. **Persistence and synchronization:** `js/userStorage.js` scopes keys by UID and enumerates keys for cloud snapshots. The backup export/import in `js/script.js` explicitly serializes fields; new proposal storage requires corresponding snapshot validation, backup/restore, reset, and synchronization coverage.
5. **Current assessment importer:** `js/pdfImport/importer.js` owns assignment extraction, assessment-specific Ollama fallback, merge, and preview. Reuse only its extraction function for PDFs; keep question generation and review in the learning domain.
6. **Tests and tooling:** `package.json` provides `npm test` using Node's built-in test runner. Place proposal-domain tests beside the existing learning tests; add browser checks only for the actual UI/extraction integration.

## 8. Recommendation for First Implementation Step

Begin with **Milestone 1: Isolated PDF Proposal Core**. Define the proposal contract and a pure generator that accepts extracted-document blocks plus an explicit `studyPlanId`; use a conservative deterministic rule for an explicit content pattern and return pending proposals with source references and diagnostics. Do not register proposals as questions, persist them in `learningState.questions`, or call an AI provider.

The first discriminating test should pass an extracted-document fixture through the generator, assert that each result is plan-bound and source-addressable, and assert that the active repository and schedulable queue remain unchanged. Include a negative fixture with ambiguous/unstructured prose that yields no ungrounded question. This validates the highest-risk boundary with the smallest code surface and gives later storage, AI, and review work a stable proposal contract.

After that boundary is proven, implement durable proposal storage and review/approval before enabling AI generation for users. Keep DOCX, PPTX, TXT, generalized OCR, and provider deployment decisions outside the first milestone; none is necessary to begin safely using the existing PDF extraction path.