# AI Question Generation Prototype Plan

**Status:** Prototype plan only; no implementation included
**Purpose:** Test whether one fixed AI setup can generate useful, source-grounded study questions from uploaded Grade Quest material before investing in proposal persistence, production UI, or expanded review workflows.

## Prototype Decision

Build one temporary, end-to-end PDF experiment using the existing extraction pipeline and the application's existing local Ollama endpoint. Use the currently configured `qwen3-coder:latest` model as the single fixed model for this experiment; do not add provider/model selection or automatic fallback. This evaluates that exact setup, not AI question generation in general.

The prototype is an owner-run quality study, not a user-facing feature. Results remain in memory for inspection and are never approved or scheduled. This deliberately tests generation before Milestones 2 and 3 in `QUESTION_GENERATION_IMPLEMENTATION_PLAN.md`; it does not change their order for a production workflow.

## 1. Existing Reusable Systems

- **PDF extraction:** `PDFImportSharedPipeline.extractImportDocument(file)` in `js/pdfImport/importer.js` reuses `PDFReader`, `PDFDocumentBuilder`, and the existing OCR fallback. It already returns the structured document needed by a separate learning-material processor.
- **Extracted document structure:** `js/pdfImport/pdfReader.js` returns normalized `text`, heuristic `sections`, and ordered `paragraphs`. Each paragraph has an `index`, `text`, `sourceText`, `pageNumber`, and `lineIndex`.
- **Milestone 1 proposal core:** `js/learning/questionGenerator.js` and `js/learning/questionProposalSchema.js` establish the plan-bound, pending proposal shape and active-catalog separation. The prototype should reuse that shape, with only the narrow validation changes needed to accept the fixed AI provenance.
- **StudyPlan records:** The versioned learning state provides existing plans with `studyPlanId` and `courseId`. Use those records to validate the target plan; do not infer or ask the model to assign ownership.
- **Existing Ollama transport:** `js/pdfImport/importer.js` calls the local Ollama `/api/generate` endpoint with a fixed model and JSON response mode. Reuse only the local endpoint/runtime convention. Its prompt, assessment parsing, confidence logic, and assessment merge are syllabus-specific and must not be reused.
- **Test tooling:** `npm test` uses Node's built-in test runner. Unit tests can mock the local HTTP response; one manual browser run is needed to exercise actual PDF.js/OCR and Ollama together.

## 2. Existing Extraction-Pipeline Inputs

The prototype flow starts with the selected uploaded PDF and calls `PDFImportSharedPipeline.extractImportDocument(file)`. It must not call `CourseOutlineImporter.import(file)`, which continues into assessment parsing and the assessment-specific Ollama path.

The generation input is a selected, bounded set of `document.paragraphs`. Preserve each paragraph's original index, page number, and line index. Use `sourceText` or `text` as the evidence excerpt. The selected source also receives a temporary `sourceId` from the prototype, while the target `studyPlanId` is resolved from the existing learning state before the request is sent.

For this experiment, use text-extractable PDFs or PDFs for which the current all-document OCR fallback returns usable text. Mixed text/scanned PDFs, diagrams, tables with unreliable reading order, and other file formats are outside scope. The existing OCR fallback runs only when the PDF has no usable extracted text, and OCR-built paragraphs may have page number `0`; the prototype must show that limitation rather than imply precise page citations.

## 3. Packaging Extracted Content for AI Generation

1. Select one existing StudyPlan and one uploaded PDF. Do not create a plan implicitly.
2. Call the shared extraction function once and inspect its warnings/available text before generation.
3. For a small prototype request, pass one selected section or one short document segment, represented as ordered blocks:

   ```json
   {
     "sourceId": "temporary-upload-id",
     "blocks": [
       {
         "blockId": "p-12",
         "paragraphIndex": 12,
         "pageNumber": 3,
         "lineIndex": 5,
         "text": "Only the extracted paragraph text is sent."
       }
     ]
   }
   ```

4. Keep the request deliberately bounded: one request for a selected segment of at most 6,000 extracted characters and no more than ten proposals. If the chosen content is too large, ask the owner to select a smaller segment; do not add resumable chunking or a general segmentation framework in this experiment.
5. Use a separate question-generation prompt with a strict JSON response format. Ask for a small set of single-answer study questions, answers, concise explanations, concept labels, and `evidenceBlockIds` for every item. Instruct the model to use only supplied blocks, abstain where they are insufficient or ambiguous, and not add outside facts. Do not provide tools, web browsing, internet search, external retrieval, URLs, or other external context. Do not send course names, user profile data, or unrelated application state.
6. The model returns evidence block IDs, not source locations, `studyPlanId`, proposal IDs, or lifecycle status. Application code resolves citations against the exact submitted block set and supplies ownership and proposal metadata itself. Reject a response that cites an unknown block.

The prompt and citation checks enforce an application policy; they cannot erase a model's pretrained knowledge or prove semantic grounding by themselves. Human comparison with the cited uploaded passages remains the quality check.

## 4. Proposal Record Design

Use the Milestone 1 proposal envelope and keep prototype records ephemeral:

```text
proposalId                 generated by Grade Quest
studyPlanId                copied from the selected existing plan
candidate                  type, prompt, answer, explanation, conceptLabel
sourceReferences[]         sourceId, blockId, paragraph/page/line, excerpt
provenance                 provider, fixed model tag, prompt version, timestamp
status                     pending-review
```

The model does not assign `proposalId`, `studyPlanId`, `sourceReferences`, or `status`. The application maps returned evidence block IDs to source references and sets `status` to `pending-review`. Keep AI output separate from the active question catalog; proposal records have no active question identity, mastery, response, schedule, or approval state. Show results in a temporary read-only output for manual scoring, then discard them. Do not add persistence, backup/sync integration, approval actions, or learner-facing review queues.

Make the minimal change to the proposal validator to accept provenance for this one fixed Ollama question-generation path while continuing to validate the existing candidate and plan ownership requirements. Do not introduce a provider abstraction or a provider-neutral framework for this one experiment.

## 5. StudyPlan Ownership Requirements

- Resolve `studyPlanId` to an existing plan before making an AI request; reject missing or unknown plans.
- Assign the selected `studyPlanId` to every proposal in application code. Never trust a model-generated plan ID.
- If the uploaded source has a known owning `courseId`, require it to match the target StudyPlan's `courseId`. A source may be reused across plans only through separately generated proposals for each explicitly selected plan.
- Every proposal belongs to exactly one StudyPlan. Reusing the same source for another plan creates distinct proposal IDs and does not copy learning state.
- Generation is read-only with respect to the active learning catalog, objectives, mastery, responses, sessions, schedules, and analytics. No AI proposal is eligible for a learning session.

## 6. Testing Strategy

**Automated tests** should cover the narrow boundary without requiring a live model:

- Valid JSON maps to proposal records with application-assigned `studyPlanId`, pending status, fixed provider/model provenance, and source references that resolve to submitted blocks.
- Missing fields, malformed JSON, unsupported question type, empty answers, excess output, unknown evidence IDs, and cross-course source/plan combinations are rejected or reported without creating active questions.
- Prompt construction includes only selected extracted blocks and contains no browser/search/tool instructions or unrelated course/user data.
- Repeated invocation has no persistence or learning-state side effects. Pending proposals remain absent from repository and schedulable question queries.
- Provider timeout, unavailable Ollama, and non-success HTTP responses leave the source document and active catalog unchanged.

**Manual end-to-end quality run:**

- Use at least three owner-provided, text-readable PDFs or distinct course sections. Include varied material, not only glossary pages. Use no external source material.
- For each sample, run the selected PDF through the existing extraction function, inspect the extracted text/locations, send one bounded segment to the fixed Ollama model, and view proposals with their cited excerpts.
- The owner rates each proposal against the cited source for factual support, answer correctness/completeness, clarity/answerability, usefulness, and redundancy. Record whether it is usable as written, needs a minor edit, or should be rejected. A reviewer must inspect the source; no second model or AI validator is used.
- Record exact Ollama/model version, prompt version, source extraction warnings, proposal count, rejected count, and reasons. Do not retain full course text or model transcripts beyond what is needed for this temporary evaluation.

There is no existing automated browser end-to-end suite. Passing mocked tests is not evidence of extraction fidelity or question quality; the manual run is required for the prototype decision.

## 7. Risks

| Risk | Mitigation |
| --- | --- |
| The current Ollama model is code-oriented and may not represent a strong education-focused model. | Treat results as specific to `qwen3-coder:latest`; record the exact model tag/version and do not generalize a poor result to all AI. Do not silently substitute another model. |
| PDF extraction loses table, formula, layout, or mixed-page OCR meaning. | Inspect extracted text and locations before generation; exclude unclear segments and record warnings. |
| The model uses prior knowledge or adds claims not present in the source. | Require block citations, reject unresolvable citations, and manually verify every accepted answer against uploaded text. A prompt is not a technical guarantee against pretrained knowledge. |
| Valid JSON appears correct while content is wrong or shallow. | Evaluate semantic correctness and usefulness manually; schema validation is only structural. |
| Local Ollama is unavailable or browser access is blocked by CORS/configuration. | Treat this as a prototype setup failure, report it, and do not add a remote fallback or provider switch. |
| Course material is sensitive even when sent to a local process. | Run only with owner-selected material, send only selected text, avoid logging prompts/responses, and keep generated records transient. |
| One model and a few PDFs provide a narrow quality sample. | State the evaluated model, prompt, and sample limits in results; require broader evidence before product rollout. |
| Proposal code is accidentally treated as active learning content. | Keep the proposal schema distinct, make the result view read-only, and assert catalog/scheduler isolation in tests. |

## 8. Success Criteria

The prototype is a **go** for further development only when all of these conditions hold:

- At least three distinct owner-provided materials are tested, targeting at least 30 candidate questions in total without filling the quota with invented or unsupported items. If the source material cannot support that sample, record the run as inconclusive rather than forcing output.
- Every proposal considered usable has evidence references that resolve to submitted blocks, and the owner confirms the cited text supports its prompt and answer. No unsupported factual claim is accepted.
- At least 75% of generated candidates are judged useful and correct as written or with only a minor wording edit; ambiguous, redundant, materially incorrect, or weakly grounded items count as rejects.
- Every proposal is bound to the explicitly selected existing StudyPlan and remains pending and outside the active question catalog; automated isolation tests pass.
- The full extraction-to-Ollama-to-proposal path succeeds on the target development environment with no assessment parser invocation, browsing, internet search, external retrieval, provider fallback, or model-to-model validation.

A **no-go** means do not build proposal persistence or a user-facing workflow yet. Record whether the cause was extraction fidelity, model capability, prompt/output quality, or local runtime setup. A **go** justifies planning durable proposal storage and an explicit human review path next; it does not authorize automatic activation or production exposure of AI-generated content.
