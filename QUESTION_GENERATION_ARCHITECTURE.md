# Question Generation Architecture

**Status:** Architecture proposal
**Scope:** Turning imported course material and user input into reviewable study-question banks
**Related sources:** `TEAM_CONTEXT.md`, `PROJECT_AUDIT.md`, `ARCHITECTURE.md`, `STUDY_PLAN_CREATION_ARCHITECTURE.md`, `LEARNING_ENGINE_ARCHITECTURE.md`, `STUDY_PLAN_ARCHITECTURE_REVIEW.md`, and `STUDY_PLAN_ENTITY_REVIEW.md`

## 1. Question Generation Goals

Question generation converts selected course material into clear, answerable, useful study questions. Its output is proposed learning content, not evidence that a student understands the material. The generation subsystem ends at reviewed, approved content; the existing deterministic learning engine remains responsible for retrieval sessions, confidence, mastery, scheduling, and analytics.

The architecture should:

- Produce questions that represent important concepts and relationships in the selected source, not merely sentences that happen to be easy to transform.
- Preserve traceability from each proposal to the source passages that support its prompt, answer, and explanation.
- Support empty plans, manual authoring, file import, and AI-assisted generation without making any one path a prerequisite for the others.
- Reuse shared file extraction and storage boundaries while keeping question interpretation separate from syllabus assessment parsing.
- Support large materials and banks incrementally, including courses with hundreds of questions.
- Make generated content inspectable, editable, rejectable, and reproducible enough to diagnose quality problems.
- Keep each bank and every question owned by exactly one StudyPlan. Duplicate content across plans is permitted, but each copy is independent.
- Avoid model training. Models, when enabled, are proposal providers only; no model decides mastery, correctness history, scheduling, or learning outcomes.

Success is measured by the usefulness and correctness of approved questions, their coverage of course objectives, and their source traceability, not by the number of generated items.

## 2. Question Generation Sources

Sources are materials from which candidate content may be derived. The source may be reusable at the course level, while every generation run and resulting bank must name one target StudyPlan.

| Source | Extraction strategy | Source references | Status and caveats |
| --- | --- | --- | --- |
| PDF | Reuse PDF.js text extraction in `js/pdfImport/pdfReader.js`; retain page and line/paragraph order. Reuse the existing OCR capability for image-only content. | Page number, block/paragraph index, and offsets when available. | Text extraction exists. Reading order, columns, tables, diagrams, and mixed scanned/text pages can be imperfect. Existing OCR behavior is a PDF importer capability, not a general image understanding system. |
| DOCX | Use a browser-compatible format adapter that returns paragraphs, headings, lists, and tables in document order. | Paragraph, heading, and table/cell identifiers or indices. | Architectural target; not an implemented capability. Embedded images and complex layout need explicit warnings. |
| PPTX | Use a format adapter that returns ordered slide text, titles, shapes, and tables. Treat speaker notes as a distinct, explicitly selected content source. | Slide number, shape/order index, and table cell references where available. | Architectural target; not an implemented capability. Text extraction does not interpret diagrams, images, or visual relationships. |
| TXT | Decode text, normalize line endings, and preserve headings, delimiters, code, formulas, and paragraph order. | Line and character offsets or stable block indices. | Straightforward format target; preserve the original structure rather than assuming all content is prose. |
| Images and future OCR | Treat OCR as a shared extraction capability that may serve scanned PDFs and image resources. Preserve recognized regions and OCR confidence. | Image/page and region coordinates, plus block identifier. | Future capability. OCR output is uncertain text, not verified source meaning; low-confidence text should be visible during review. |

File support is provided by format adapters, not by separate end-to-end question-generation stacks. A file type that cannot be extracted reliably should produce an explicit unsupported-content or extraction-warning result rather than silently yield a low-quality bank.

## 3. Shared Extraction Pipeline Integration

The existing `js/pdfImport/` subsystem separates PDF reading, OCR, assessment-specific parsing, validation, preview, and orchestration. `PDFImportSharedPipeline.extractImportDocument()` is the relevant reuse boundary: the learning-material workflow already has precedent for consuming shared extraction while applying its own interpretation. The PDF reader currently returns normalized text, heuristic sections, paragraphs, and page/line metadata.

Reuse the shared extraction layer for file intake, format detection, decoding, OCR invocation where applicable, normalized document output, source locations, warnings, and resource limits. Add or adapt format-specific extractors behind that shared boundary as formats are supported. Do not use `AssignmentParser`, assessment confidence rules, assessment merging, or the syllabus Ollama prompt as generic question-generation logic; those components encode a different domain and output contract.

The boundary is:

1. **Ingestion** identifies the source, validates the file, records user-selected content and target StudyPlan, and creates an extraction run.
2. **Extraction** returns a canonical, ordered document with source-addressable blocks and extraction diagnostics. It does not decide what is educationally important or invent objectives.
3. **Selection and segmentation** lets the user choose material and divides it into coherent, bounded generation units while preserving source references.
4. **Question generation** applies deterministic templates, an optional AI provider, or both to selected units.
5. **Validation and review** establish whether a proposal is structurally usable and let the user judge subject-matter correctness before activation.

Extraction fidelity and question quality are separate concerns. A well-formed canonical document can still be incomplete or misleading; warnings and source locations must travel with content through generation and review. Existing extraction behavior should be reused, but a feature-specific canonical contract may be needed to preserve richer structure than the current PDF assessment flow consumes.

## 4. Structured Content Model

Before generation begins, extraction should produce a canonical representation of what the source contains, not a premature interpretation of what it teaches. At minimum, the representation needs:

| Record or field | Purpose |
| --- | --- |
| Source identity | Stable source/resource ID, original filename, detected format, size, selected course, and source revision or content hash where available. |
| Extraction run | Run ID, extractor and version, timestamps, status, warnings, and whether OCR was used. This distinguishes a new extraction from a re-generation over unchanged content. |
| Ordered content blocks | Stable block ID, sequence, text, block kind (for example heading, paragraph, list item, table, formula, code, or OCR region), and parent/section relationship. |
| Source location | Format-specific location such as PDF page and line, DOCX paragraph/table cell, PPTX slide and shape, or TXT line/offset. References must resolve to the retained source or clearly indicate when only a citation is retained. |
| Structural hints | Heading hierarchy, list nesting, table row/cell order, slide boundaries, and other structure the extractor can support. Mark heuristic structure as heuristic. |
| Extraction diagnostics | Per-block or per-region confidence when available, OCR confidence, skipped content, reading-order uncertainty, and unsupported image/table/layout warnings. Do not represent unavailable confidence as certainty. |
| Normalized text | Searchable text assembled from blocks while preserving block order and identity. Normalization must not erase equations, symbols, code, meaningful delimiters, or table relationships. |

The canonical model may carry explicit metadata such as detected language if reliably available, but should not claim to extract concepts, learning objectives, facts, or answer keys as verified truth. Such interpretations belong to proposal generation and must remain reviewable. The extraction model is an interchange format for features, not a requirement that all formats have equal fidelity.

## 5. Question Proposal Architecture

Question proposals are isolated from the active question repository. A proposal bank is associated with one existing StudyPlan from creation onward and records the selected sources, source revision, generation method, and lifecycle state. Proposed questions carry that same `studyPlanId`, but must not be returned by the scheduler, session coordinator, or any active-catalog query.

Each proposal should contain, where applicable:

- A prompt and complete answer definition, stored separately so the answer is not exposed during retrieval.
- An explanation that supports feedback and clarifies why the answer is correct.
- A question type, concept or topic, one or more candidate objective links, and an application level.
- One or more source-block references and supporting excerpts or compact evidence sufficient for reviewer verification.
- Generation provenance: deterministic rule or provider, model/version when applicable, generation/schema version, timestamps, and validation results.
- A review state and reviewer decision history, including edits where useful for auditability.

The lifecycle is:

`draft proposal -> structurally validated -> pending review -> approved | edited and approved | rejected | deferred`

Generation should be resumable by bounded chunk or section. A failed chunk must not invalidate previously completed proposals, and retrying an unchanged chunk should not silently duplicate proposals. Candidate deduplication is advisory: semantically similar questions should be surfaced for review, not automatically discarded when they test different levels or applications of a concept.

Approval is the only boundary into the active StudyPlan catalog. At approval, the question and referenced objectives must pass the existing learning catalog contract, receive stable IDs, and be checked against the target plan. Newly approved questions use the learning engine's normal initial mastery rule; approval does not imply mastery. A rejected proposal never creates a response, mastery, schedule, or analytics record.

## 6. Generation Approaches

| Approach | Strengths | Limitations | Appropriate role |
| --- | --- | --- | --- |
| Rule-based generation | Deterministic, fast, low marginal cost, offline-capable, easy to explain and validate. Works well when the source has predictable structures such as glossary entries, explicitly stated definitions, formula/example pairs, or well-formed question banks. | Brittle across subjects and document styles. Surface patterns often omit context, produce shallow recall, misread tables or negation, or turn incidental wording into a question. Rules cannot reliably infer importance, conceptual relationships, misconceptions, or valid application questions from arbitrary prose. | A bounded source of straightforward candidates where the structure supports a trustworthy transformation; never the only general-purpose generation method. |
| AI-assisted generation | Can interpret context, propose paraphrased explanations, identify relationships, and draft application questions from varied prose. It can reduce authoring effort on heterogeneous material. | Can hallucinate, misstate answers, omit caveats, create ambiguity or plausible-but-wrong distractors, and vary between runs. Has provider cost, latency, privacy, connectivity, and review burdens. Structural validity does not establish correctness. | An optional proposal provider for selected, source-grounded material, under explicit user and provider controls. |
| Hybrid generation | Combines deterministic extraction, segmentation, schema validation, source linking, deduplication signals, and bounded templates with AI's contextual drafting where it adds value. Preserves a useful non-AI path and makes failures more diagnosable. | Requires a clear division of responsibility. Blindly merging rule and model output can create duplicates, conflict, or false confidence; validation and human review still cost time. | Recommended system architecture: deterministic pipeline and gates, optional AI for semantic drafting, and human approval for learning-catalog activation. |

**Rule-based generation alone is not sufficient** for the product goal of high-quality questions across diverse course materials. It is appropriate for narrow, predictable transformations and as a no-AI fallback, but broad rules will either remain shallow or accumulate fragile, subject-specific exceptions. Extraction rules must not be confused with semantic understanding.

**AI should be optional, not required.** Empty plans, manual entry, imported source review, and supported deterministic templates remain useful without a model, offline, or when the user declines external processing. AI unavailability or failure must not block plan creation or prevent use of already-approved questions.

**A hybrid architecture provides the best balance** of quality potential, cost, speed, and maintainability. Deterministic code should own extraction orchestration, selection, chunk boundaries, schemas, plan ownership, provenance, structural checks, duplicate signals, and activation gates. AI should draft candidate educational content from bounded, selected evidence. Do not let the model silently overwrite deterministic results or certify its own correctness. The current local Ollama assessment fallback demonstrates an optional provider pattern only; its assessment prompt and model choice are not a general question-generation implementation, and local Ollama is not available to ordinary hosted users by default.

## 7. Question Types

Question types should be selected according to the material and learning objective. The type should define the response shape and validation requirements; a label alone does not make a question pedagogically useful.

| Type | Intended use | Important generation and review concerns |
| --- | --- | --- |
| Definition / term | Retrieve a precise meaning, condition, or distinction. | Include enough context to disambiguate terms; reject circular prompts and answers that merely repeat the prompt. |
| Concept / explanation | Explain a principle, mechanism, or reason. | Require a complete answer and explanatory rationale; avoid prompts with many unbounded valid answers unless a rubric is supplied. |
| Relationship / comparison | Explain how ideas, causes, stages, or categories relate or differ. | Preserve both sides and direction of the relationship; cite evidence for causal claims and avoid conflating correlation with causation. |
| Application / scenario | Apply a concept or procedure to a new case. | The scenario must contain the information needed to answer and must not add unsupported assumptions. The answer should explain the applied reasoning. |
| Calculation / worked problem | Compute or derive a result using formulas, values, units, or constraints. | Preserve formula symbols and units; validate values and expected answer format; provide a derivation or answer key. Do not generate numeric variants unless their answer can be independently checked. |
| Multiple choice | Select among one or more defined options. | Specify single- versus multiple-select behavior and the complete correct set. Distractors must be plausible, distinct, and not accidentally correct; explanations should address why the answer is right. This type has elevated review needs. |
| Ordering / sequence | Recall ordered stages, events, or procedures. | Use only when order matters in the source; preserve all necessary steps and define partial-credit policy if supported. |
| Short answer / recall | Retrieve a concise fact, label, or list. | Define acceptable variants or a rubric; avoid over-reliance on exact string matching for equivalent wording. |

The initial catalog may support fewer response mechanics than the full set of pedagogical types. A question type must not be activated until its answer representation and evaluation behavior are supported by the learning-engine contract. Generation architecture does not change deterministic engine semantics.

## 8. Question Quality Controls

Quality controls operate at multiple levels. Passing automated checks means a proposal is reviewable, not that it is correct.

### Extraction and evidence

- Preserve a resolvable source reference for the claims in the answer and explanation.
- Flag OCR, reading-order, table, formula, or layout uncertainty and avoid generating as though uncertain text were authoritative.
- Keep generation grounded in selected source blocks. Any necessary context not present in the source should be identified rather than silently invented.

### Deterministic validation

- Require a non-empty prompt, supported response type, complete answer definition, explanation where the catalog requires it, and valid objective/concept references.
- Check that each source reference belongs to the generation run and target plan context.
- Check for exact duplicate prompts, near-duplicate candidates, empty options, conflicting correct options, and unsupported answer shapes.
- Apply type-specific completeness checks, including units and derivation data for calculations and a single clearly identified answer set for multiple choice.
- Enforce size and content limits, sanitize unsafe markup, and reject malformed provider output. Parsing a valid JSON response is not a quality check.

### Semantic and educational review

- Check that the prompt is unambiguous, answerable from the cited material, appropriately scoped, and aligned with the intended objective.
- Check answer correctness, completeness, terminology, explanation quality, and whether relevant conditions or exceptions were omitted.
- Detect shallow paraphrases, trivia, answer leakage in the prompt, duplicate coverage, and questions whose wording gives away the answer.
- Assess the bank for meaningful coverage across selected sections, objectives, and question/application levels without treating raw question count as coverage.
- Give particular scrutiny to calculations, causal relationships, medical/legal/safety claims if present in course material, and generated multiple-choice distractors.

Automated semantic checks can identify suspicious or unsupported items, but cannot prove truth. User review remains mandatory for generated proposals. Review tools should display the evidence and uncertainty close to the proposal, allow edits and rejection at question level, and avoid presenting a model confidence value as a correctness guarantee.

## 9. Question Review Workflow

1. The user selects source material and one target StudyPlan. The source may remain a reusable course resource; the proposal bank is plan-specific.
2. Extraction presents usable structure and warnings. The user selects relevant sections or blocks and may exclude irrelevant, sensitive, or low-confidence material.
3. Selected material is segmented into coherent units. Generation produces a bounded set of proposals with source references, type, answer, explanation, objectives, and provenance.
4. Deterministic validation blocks malformed or ownership-invalid proposals and flags suspicious items. Valid proposals enter a review queue; none are schedulable.
5. The user can inspect source evidence, edit question content and objective links, approve, reject, or defer individual proposals. Bulk approval, if offered, must apply only to an explicitly inspected and selected set; it cannot bypass validation or ownership checks.
6. Approval creates or activates plan-owned catalog content. Rejected and deferred proposals remain outside learning sessions. The user can later return to the queue without regenerating the whole source.

Manual questions may be authored directly into a plan when complete and valid. If saved as drafts, they remain inactive until they satisfy the same catalog requirements. Empty-plan creation requires no source or generator. Importing a file alone creates no questions and does not modify learning progress.

## 10. Storage and Ownership Model

```text
User
└── Course
    ├── Source resource (may be reused by multiple plans)
    └── StudyPlan
        ├── Plan-specific proposal bank and review state
        ├── Approved questions and objectives
        └── Learning progress (owned by the existing learning engine)
```

- A question bank, generation run, proposal, approved question, and objective belongs to exactly one StudyPlan. Source resources may be course-owned and reused, but reuse creates independent plan-specific questions.
- Every proposal has the target `studyPlanId` before generation. A course ID alone is not a valid target. Parent-course consistency is validated against the plan.
- The same source content copied into two StudyPlans receives independent question/objective identities and independent mastery, confidence history, schedules, responses, sessions, and analytics. No progress transfers automatically.
- Proposed and rejected content is stored separately from the active/schedulable question set. Approval moves validated content across that boundary; generation never writes responses or mastery.
- Use the existing `GradeQuestStorage` user-scoped persistence boundary and learning-state validation/synchronization conventions. Preserve schema versioning and backup/restore ownership checks.
- Retain compact provenance, stable source/block references, hashes or revisions when available, and review decisions. Do not duplicate source binaries, full extracted text, or unbounded raw model transcripts into the existing single Firestore `appData` snapshot by default. Source retention and citation availability must be explicit.
- If a source is removed or not retained, the reference must honestly indicate that its content cannot be reopened. Do not keep misleading citations to unavailable source material.

The proposal bank is a content and provenance grouping, not a new learning aggregate. StudyPlan remains the source of truth for approved questions and progress. This preserves the existing plan-scoped engine contract and avoids treating source documents or generated drafts as learning records.

## 11. Scalability Considerations

Hundreds of questions in a long StudyPlan are valid. The architecture should scale by bounded processing and review rather than by imposing an arbitrary short-plan limit.

- Segment documents by headings and structural boundaries where trustworthy; avoid splitting definitions, tables, formulas, or examples without needed context.
- Bound each generation request by provider/context constraints and process documents and proposal banks in resumable chunks. Persist completion and errors per chunk so a retry does not repeat successful work or duplicate its proposals.
- Let users select material and control generation scope. Generating every possible question from every source by default increases cost, noise, and review burden without guaranteeing coverage.
- Support a large review queue through incremental persistence, filtering/grouping, and pagination or equivalent progressive loading. Do not require one all-or-nothing in-memory generation response.
- Perform deduplication and coverage checks at source-section and plan level, with human resolution for semantic collisions. Stable source and generation identifiers support idempotency and regeneration comparison.
- Define file size, page/slide count, text length, timeout, concurrency, and memory limits at ingestion/provider boundaries. Report partial completion and actionable failure reasons.
- Keep large source artifacts outside the compact learning snapshot where the deployment architecture permits; account for browser local-storage and single-document Firestore limits. Large-bank persistence should not make unrelated academic workspace data unsavable.
- Track provider usage and let the user understand or limit cost before generation. AI latency or outages should not prevent manual work or retrieval from approved questions.

## 12. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Extracted text loses layout, table, diagram, formula, or reading-order meaning. | Incorrect prompts or answers despite technically successful extraction. | Preserve structure and locations, surface extraction warnings, and require source review; do not claim support for visual content until an adapter can represent it. |
| Rule templates create shallow or misleading questions. | Low-value banks and false confidence in coverage. | Limit deterministic generation to structures with explicit semantics; treat it as a candidate source, not a general solution. |
| AI invents or distorts facts, conditions, answers, or distractors. | Students rehearse incorrect material. | Ground each proposal in cited blocks, run deterministic checks, flag uncertainty, and require human approval. |
| Model output is valid structurally but wrong semantically. | Automated validation may pass a bad question. | State clearly that validation is not correctness proof; display evidence and keep approval explicit. |
| Sensitive course material is sent to a provider unexpectedly. | Privacy, consent, and institutional-policy concerns. | Make provider, destination, retention, and data transfer explicit; require deliberate opt-in; support non-AI paths; never ship hosted provider secrets in browser code. |
| Hosted AI integration is assumed to exist in a static client. | Credential exposure or an unusable feature. | Use a provider boundary; the current app has no server-side inference layer. Any hosted provider requires an appropriately secured service and privacy decision, not a browser-embedded secret. |
| Proposal banks become mixed across plans or progress leaks between copies. | Ownership and learning-history corruption. | Require one `studyPlanId` on every bank/proposal; validate against the parent plan and test independent copies. |
| Large imports exceed local storage, memory, Firestore snapshot, or model context. | Lost work, slow interface, or failed synchronization. | Bound and chunk work, persist incrementally, retain compact provenance, and avoid embedding large binaries/full transcripts by default. |
| Re-import or regeneration creates duplicates or overwrites edited content. | Confusing review queues and accidental loss of user edits. | Make generation runs identifiable and idempotent; compare revisions and require explicit decisions before replacing or merging reviewed content. |
| Question quantity is mistaken for learning quality. | Noisy plans and poor objective coverage. | Measure source/objective coverage and review quality, not just count; allow selection and rejection of redundant items. |
| New extractors increase PWA download cost or break offline behavior. | Degraded load performance and offline availability. | Evaluate browser compatibility, dependency footprint, licensing, caching, and offline behavior per adapter. |

## 13. Recommended Architecture

Adopt a **shared extraction, hybrid generation, human-approval architecture**:

```text
PDF / DOCX / PPTX / TXT / future OCR
                  |
                  v
     Shared ingestion and extraction
                  |
                  v
 Canonical source-addressable document
                  |
                  v
 User selection and bounded segmentation
                  |
          +-------+-------+
          |               |
          v               v
 Deterministic       Optional AI provider
 templates/rules     for semantic drafts
          |               |
          +-------+-------+
                  v
   Normalize, validate, trace, deduplicate
                  |
                  v
  Plan-bound proposal bank (not schedulable)
                  |
                  v
       User review and approval
                  |
                  v
 Plan-owned approved question catalog
                  |
                  v
 Existing deterministic learning engine
```

Reuse the PDF.js/OCR and shared extraction work already in Grade Quest; add future formats as adapters producing the canonical source-block model. Keep syllabus assessment parsing and its optional Ollama fallback dedicated to syllabus assessment interpretation. Do not create duplicate PDF extraction stacks or reinterpret parser-training data as question quality data.

Use deterministic code for ownership, extraction orchestration, segmentation, schemas, provenance, structural/type validation, retry behavior, and activation. Use deterministic question templates only where the source form justifies them. Offer AI as an opt-in provider for contextual question and explanation drafts, with explicit privacy and cost behavior; neither AI nor AI availability is required for creating or using a StudyPlan. Require user review before generated content enters the active catalog.

This division best balances quality potential, cost, speed, and maintainability: AI contributes where flexible interpretation has value, deterministic components keep the system bounded and explainable, and human approval handles correctness that automated checks cannot establish. It reuses Grade Quest's existing document and learning systems while preserving the central invariant that each question and all resulting learning progress belong to exactly one StudyPlan.