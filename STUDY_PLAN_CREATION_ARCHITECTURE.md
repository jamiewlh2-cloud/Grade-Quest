# Study Plan Creation Architecture

**Status:** Architecture proposal
**Scope:** Creating Study Plans and populating them with authored, imported, or AI-proposed learning content
**Related sources:** `TEAM_CONTEXT.md`, `PROJECT_AUDIT.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `LEARNING_ENGINE_ARCHITECTURE.md`, `STUDY_PLAN_ARCHITECTURE_REVIEW.md`, and `STUDY_PLAN_ENTITY_REVIEW.md`

## 1. Study Plan Creation Workflow

Study Plans are independent learning environments owned by one existing course. A course may have no plans or several plans; opening a course must not create one implicitly. Creation begins with an explicit course context, a plan name, optional description, and one of the supported content-entry methods.

The creation lifecycle is:

1. Select an existing course and create a StudyPlan with a stable ID and its owning `courseId`.
2. Select how to start: empty, manual authoring, source-material import, or AI-assisted question proposals.
3. For file-based paths, create a source/import record and extract content without changing the learning catalog.
4. Where applicable, derive question-bank proposals from selected material and validate their structure and source references.
5. Review and approve content before it becomes schedulable. A source document, extracted text, or AI response is never itself evidence of mastery.
6. Save approved questions and objectives under that StudyPlan. The adaptive learning engine then consumes the active, validated question catalog.

An empty plan is a complete result of creation. Adding content later does not change plan identity. If import or generation is cancelled or fails, retain the plan only if the user already committed its creation; otherwise discard the unfinished draft. Re-running an import must not silently duplicate approved questions or progress.

## 2. Study Plan Creation Methods

### Empty Study Plan

Create the plan and its metadata with no question banks or questions. The plan remains available for later manual authoring or import. It has no learning analytics until learning events exist.

### Manual Question Entry

The user authors questions directly in a selected plan. Each question must satisfy the learning catalog contract before activation: stable identity, prompt, answer definition, explanation, question type, concept, at least one objective, and plan ownership. User-authored content can be approved by the author as part of saving; incomplete drafts remain outside the schedulable catalog.

### File Import

Import creates a source-material record associated with the selected course or plan context. Extraction produces reusable text and structure, not questions. The user may keep the material as a resource, select portions for question generation, or author questions from it later. Import alone never activates questions.

### AI-Assisted Generation

Generation consumes explicitly selected extracted material and a target StudyPlan. It creates a reviewable question-bank proposal, not active learning content. The plan is required before generation so proposals cannot be ambiguously attached to a course or assigned to a default plan later.

These methods share the same final question and objective validation boundary. They differ only in how candidate content is authored and how provenance is captured.

## 3. Shared Document Ingestion Architecture

Use one shared ingestion architecture for syllabus importing, learning-material importing, and future document features. This means shared file intake, format detection, extraction, normalization, provenance, limits, and error handling. It does **not** mean one universal parser or one interpretation prompt for every feature.

The architecture has four boundaries:

1. **Source intake:** accept a file, validate supported type and size/page limits, capture safe metadata, and create an ingestion run with an explicit feature purpose and owner context.
2. **Format adapters:** extract each format through a dedicated adapter and return the same canonical document representation.
3. **Canonical document:** retain ordered text blocks with source locations and structural hints, such as page, slide, paragraph, heading, table, or block index. Preserve extraction warnings and confidence where available.
4. **Feature processors:** consume the canonical document for a specific purpose, such as syllabus assessment extraction, learning-material segmentation, or another future document feature. Each processor owns its interpretation, domain validation, AI use, preview, and destination.

The canonical document is an interchange format, not a claim that all formats have identical fidelity. It should preserve enough source coordinates and original metadata for review and citations. Extraction artifacts may be temporary; durable storage should keep only what the feature needs, with an optional reference to a retained course resource. Large source binaries and full extracted text should not be embedded by default in the existing single Firestore `appData` snapshot.

## 4. Existing Parser Reuse Opportunities

The current implementation already demonstrates the preferred boundary:

- `js/pdfImport/pdfReader.js` uses PDF.js and exposes `PDFReader.extractDocument()`, `PDFDocumentBuilder.fromText()`, and `fromLines()`. Its document includes normalized text, paragraphs, page/line positions, and heuristic sections.
- `js/pdfImport/ocrProcessor.js` renders PDF pages and runs Tesseract.js when text extraction returns no usable text. Its current contract is PDF-specific and returns plain OCR text.
- `js/pdfImport/importer.js` exposes `PDFImportSharedPipeline.extractImportDocument()` and a hybrid assessment pipeline.
- `pdfImportLearningTest/learningImporter.js` already calls the shared extraction function. This is direct precedent for separate feature processors using common extraction rather than duplicating PDF/OCR logic.
- `js/pdfImport/parsers/assignmentParser.js`, `courseParser.js`, the date/weight parsers, `ImportValidator`, and `runHybridAssessmentPipeline()` are syllabus/course-assessment interpretation. Their assumptions and outputs are not suitable as a generic learning-material parser.
- The optional Ollama prompt in the syllabus importer extracts graded assessments and is not a question-generation service. The current Ollama integration is local-only and is not a hosted inference capability.
- `js/pdfImport/previewModal.js` reviews assessment rows. Its human-approval principle is reusable; its assessment-specific fields and component are not a reusable question review model.
- The PDF importer’s correction/training records are parser evaluation data. They must remain separate from student questions, response history, mastery, and Study Plan persistence. No model training is required for this architecture.

Accordingly, retain the existing PDF extraction behavior behind a shared document-ingestion boundary, adapt its output toward the canonical representation, and keep domain parsers and review contracts separate. Extraction accuracy and interpretation quality are different concerns and should be measured and corrected separately.

## 5. File Type Strategy

Support should be added through format adapters that produce the canonical document representation. The repository currently implements PDF text extraction and PDF OCR only; the other formats below are architectural targets, not current capabilities.

### PDF

Reuse PDF.js text extraction and page locations. Preserve page and line ordering and mark sections as heuristic. Scanned pages need an OCR path; the current importer invokes OCR only when the extracted document has no text, so mixed text/scanned documents are a known limitation. Tables, multi-column layouts, headers, and reading order should be presented as extraction uncertainty rather than silently treated as reliable structure.

### DOCX

Use a browser-compatible DOCX text/structure extractor that can preserve paragraphs, heading hierarchy, lists, and table cell order. Keep paragraph/table references for source citations. Embedded images and complex layout may not yield dependable text and should be flagged as unsupported or unprocessed until image OCR is introduced. Avoid implementing WordprocessingML parsing independently in each feature.

### PPTX

Extract slide text in presentation order, preserving slide number, title, shape order, and table text when available. Speaker notes should be an explicit source-selection policy because they may contain presenter-only material; do not mix them into visible slide content without provenance. Images and diagrams are not understood by text extraction and remain a later OCR/vision concern.

### TXT

Read text directly from the selected file, normalize line endings and encoding where possible, and retain paragraph/line offsets. The extractor should not discard headings, code, formulas, or delimiters merely to create prose paragraphs; segmentation belongs to a later, purpose-specific stage.

### OCR / Image (Future)

Make OCR a pluggable extraction capability shared by scanned PDFs and image resources. The existing Tesseract.js integration is a starting point, but it currently rasterizes PDF pages and returns plain text. A generalized OCR result should preserve page/image region, recognized text, and confidence so low-confidence content can be corrected before generation. OCR/image understanding is future scope, not a prerequisite for the initial file strategies.

The application is a static browser client with dependencies loaded from CDN and no declared browser dependencies in `package.json`. Any extractor choice must therefore be evaluated for browser compatibility, bundle/download cost, offline/service-worker behavior, licensing, file-size limits, and deployment policy before adoption.

## 6. AI Generation Pipeline

AI is an optional content-proposal provider behind an adapter. It must not become a dependency of plan creation, manual authoring, extraction, or the deterministic adaptive engine.

The generation path is:

1. Select one target StudyPlan and selected source document sections. Record the source version and source locations.
2. Segment long material into bounded, ordered chunks using document structure where available. Include enough local context for coherent questions, avoid arbitrary cuts through tables or definitions, and retain source references for every chunk. Process large documents incrementally so a failure does not require repeating completed extraction or generation.
3. Request structured candidate questions, answers, explanations, concept/objective links, question type, application level, and source references. Generation may propose objectives when needed, but those objectives are candidates subject to review and plan ownership.
4. Normalize the provider response, then deterministically validate required fields, answer completeness, supported types, objective references, source traceability, duplicate/equivalent prompts, and size constraints. Invalid or unsupported output remains rejected or editable draft data; it is not repaired into correctness by assuming the model is right.
5. Persist the candidate bank and generation provenance in a review state, isolated from the active question repository.
6. Present candidates for user correction and approval. Only approved records cross into the StudyPlan’s active question/objective catalog.

Record the provider/model and generation timestamp when available, generation/schema version, source references, validation outcomes, and reviewer decisions. Minimize retention of prompts and raw model output where they contain full source text. Do not silently upload academic documents to a third-party provider: provider, privacy, consent, and data-retention behavior must be explicit. The current local Ollama assessment fallback does not satisfy a general hosted AI generation requirement by itself.

## 7. Question Review and Approval Workflow

Generated content has a lifecycle distinct from the learning question lifecycle:

`proposed -> validation-passed -> pending-review -> approved | edited-and-approved | rejected`

Pending and rejected candidates are not returned by the scheduler, session coordinator, or active question repository. Approval is explicit at question level; a bulk-approve action may be offered only when the user can inspect what will be activated. Review should allow editing prompts, answers, explanations, objectives, question type, and source references, and rejecting or deferring individual candidates. Duplicate or uncertain proposals should be clearly surfaced.

Approval assigns or finalizes stable question/objective IDs, validates that all records target the same existing StudyPlan, records provenance and reviewer state, and initializes new question mastery using the engine’s existing initial mastery rule (currently 10). Approval is content curation, not evidence that the student has learned the material. Correctness feedback, confidence, mastery transitions, scheduling, and analytics remain wholly owned by the existing deterministic engine.

Manual drafts follow the same catalog validation and activation rules, but do not need AI-generation provenance. The question bank is a content grouping and provenance unit; it does not replace the StudyPlan as the owner of questions or progress.

## 8. Ownership Model

The existing ownership rules remain authoritative:

```text
User
└── Course
    ├── Course resources / source documents
    └── StudyPlan (zero or more)
        ├── Question-bank records and approved questions
        ├── Objectives
        ├── Mastery, schedules, responses, sessions, analytics
        └── Generation/review provenance for its question banks
```

Each StudyPlan belongs to exactly one course. Every question bank and generated question must target exactly one plan before activation. Questions, objectives, mastery, schedules, sessions, responses, and analytics remain plan-owned. Duplicating material into another plan creates independent questions and independent progress; there is no automatic mastery transfer.

The original source document can be a course resource so it can be reused by more than one plan. An ingestion run records the source and its purpose; a generated/imported question bank records its one target StudyPlan and links back to source locations. Syllabus extraction continues to produce course-level outlines/assessments and planner items, not StudyPlan questions. This separates reusable source ownership from feature-specific output ownership.

Persist compact source metadata and provenance in the relevant user-owned data. Avoid placing source binaries, data URLs, duplicated full text, or unbounded model transcripts into the learning payload or Firestore snapshot. If the source is not retained, preserve enough extracted-source identity and location data to make citations honest; do not imply a source can be reopened when it cannot.

## 9. Data Flow

```text
User selects course, StudyPlan, file, and purpose
                 |
                 v
       Shared source intake/run
                 |
                 v
     File-specific extraction adapter
                 |
                 v
 Canonical document + locations + warnings
          /                         \
         v                           v
 Syllabus processor          Learning-material processor
 (assessment rules)          (select/segment source material)
         |                           |
 Course outline / tasks      Optional AI question proposals
                                     |
                                     v
                         Validate + review + approval
                                     |
                                     v
                       Plan-owned question repository
                                     |
                                     v
                      Deterministic adaptive engine
```

The ingestion layer owns file decoding and extraction only. Feature processors own interpretation and destination schemas. Approval is the boundary between candidate content and active learning content. The engine consumes only approved questions with an explicit `studyPlanId` and never reads raw documents or invokes a model to decide mastery or scheduling.

Persistence continues through the existing `GradeQuestStorage` user-scoped boundary and snapshot synchronization path. The current versioned `learningState` validates plans and plan-owned question/progress records. Source files and extraction artifacts need an explicit size/retention policy because both local storage and the Firestore snapshot are constrained; adding content must not undermine offline use or make a single snapshot grow without bound.

## 10. Risks

| Risk | Architectural response |
| --- | --- |
| A shared pipeline becomes a universal parser with tangled feature rules. | Share extraction and canonical data only; keep syllabus and learning-material processors independently scoped. |
| Correctly extracted text is interpreted as the wrong kind of content. | Preserve the user-selected purpose, run feature-specific validation, show provenance, and require review before consequential writes. |
| AI produces false answers, ambiguous questions, or unsupported objectives. | Treat output as a proposal; validate deterministically and require explicit review/approval. |
| Large files or question sets exhaust browser memory or create unwieldy snapshots. | Enforce extraction limits, process incrementally, avoid duplicate binary/text storage, and define retention/compaction before broad persistence. |
| Layout, tables, scanned pages, and diagrams lose meaning during extraction. | Keep page/slide/paragraph references and warnings; expose low confidence; support OCR as a separate capability rather than claiming uniform fidelity. |
| Re-import creates duplicate banks or questions. | Track source identity and import/generation provenance; provide deterministic duplicate detection and explicit merge/replace decisions. |
| Source content is sent to an external model unexpectedly. | Make provider and data transfer explicit, minimize sent content, and keep manual/non-AI paths fully usable. |
| Learning progress leaks across Study Plans. | Require `studyPlanId` at bank approval and for all learning records; preserve the existing schema ownership validation and isolation rules. |
| Parser-training state is confused with learner state. | Keep `pdfImportLearningTest` schemas and corrections separate from StudyPlan content, mastery, and response history. |
| New extractor dependencies impair the static/PWA application. | Evaluate browser support, deployment/CDN, caching, offline behavior, cost, and licensing before selecting format libraries. |
| Review UI cannot scale to very large generated banks. | Treat review as a staged, filterable queue with incremental persistence; never require one enormous all-or-nothing result. |

## 11. Recommended Architecture

Adopt **one shared, format-agnostic document-ingestion architecture with multiple format adapters and purpose-specific processors**. This avoids duplicated file decoding, PDF/OCR handling, normalization, provenance, limits, and error semantics while preserving domain separation where extraction has historically been weaker than interpretation.

Reuse `PDFReader`, `PDFDocumentBuilder`, `OCRProcessor`, and `PDFImportSharedPipeline.extractImportDocument()` as the current PDF foundation. Evolve their contract toward a canonical document with stable source locations and warnings; do not generalize the syllabus assessment parser, assessment preview schema, or Ollama prompt into learning-question components. The experimental learning syllabus importer is evidence that a second feature can reuse extraction without sharing interpretation.

Keep the system’s ownership boundaries explicit: source resources may be course-scoped and reusable; each question bank and every approved question are owned by one StudyPlan; pending AI proposals stay outside the schedulable catalog; the deterministic learning engine remains the sole consumer of approved question banks. Add DOCX, PPTX, TXT, and generalized image/OCR through adapters to the same ingestion contract, not parallel end-to-end import stacks. This is the best fit for reuse, plan isolation, maintainability, and the project’s static-client architecture.