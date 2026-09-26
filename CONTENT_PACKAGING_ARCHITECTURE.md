# Content Packaging Architecture

**Status:** Architecture proposal
**Scope:** Preparing uploaded course materials for reliable, source-grounded AI question generation
**Related sources:** `TEAM_CONTEXT.md`, `STUDY_PLAN_CREATION_ARCHITECTURE.md`, `QUESTION_GENERATION_ARCHITECTURE.md`, `QUESTION_GENERATION_IMPLEMENTATION_PLAN.md`, `AI_GENERATION_STRATEGY.md`, and `AI_QUESTION_GENERATION_PROTOTYPE_PLAN.md`

## 1. Content Segmentation Strategy

Content packaging converts extracted source documents into bounded, traceable units for generation. It does not decide which facts are true, create verified learning objectives, or activate questions. The input is the canonical ordered content with extraction warnings and source locations; the output is a set of generation units whose blocks can be traced back to the selected uploaded sources.

Use a staged hierarchy:

1. **Source:** one uploaded file or explicitly selected retained course resource, with stable identity and extraction revision.
2. **Structural region:** a trustworthy document boundary such as a chapter, slide group, heading section, or named table.
3. **Generation unit:** a contiguous, token-bounded sequence of blocks suitable for one bounded request. Prefer keeping a coherent section intact when it fits; otherwise split it at the least disruptive block boundary.
4. **Context supplement:** a small, explicitly identified set of neighboring blocks, such as a heading, definition, or referenced example, included only when needed to interpret the main unit.

Keep block order and block identity stable within an extraction revision. A generation unit has a primary range and may have supplemental context, but supplemental text is not counted as new coverage and must not be cited as though it belonged to the primary range. Do not flatten all files into one text string before segmentation: doing so erases boundaries, locations, and extraction warnings.

Segmentation should preserve coherent meaning, not target an arbitrary number of pages. Avoid cutting between a heading and its first explanatory paragraph, within a definition and its conditions, within a worked example and its solution, or inside a table, formula, list, or code block when the extractor identifies that structure. If an indivisible region is too large or its structure is unreliable, mark it as requiring smaller user selection or omit it with a clear diagnostic; do not truncate it silently.

## 2. Section Detection Strategy

Section detection is a ranking of boundaries by evidence, not a claim that every heading identifies a verified topic. Preserve the source's own structure and the confidence or origin of each boundary.

Use boundary evidence in this order:

1. **Explicit format structure:** DOCX heading levels, PPTX slide boundaries and titles, PDF bookmarks or clearly extracted headings, and explicit TXT heading patterns. Retain the original hierarchy and location.
2. **Consistent visual/text patterns:** repeated heading-like typography or numbering, such as chapter and subsection labels, when the extractor exposes reliable signals. Mark these as inferred.
3. **Heuristic text cues:** short standalone lines, numbering, capitalization, whitespace, or repeated lexical patterns. These are navigation hints only and should have lower confidence.
4. **Fallback boundaries:** page, slide, paragraph, or block ranges when no useful headings are available. Do not invent semantic section names.

Keep section titles and their source locations as metadata linked to the underlying blocks. A heading may be included as context for the following unit, but it should not be treated as evidence for a factual answer by itself. Heuristic section boundaries can guide splitting and coverage reporting, but must not be presented as verified course topics or objectives.

Where a document has a table of contents, repeated headers, multi-column reading order, or unclear layout, retain extraction warnings. Do not use an inferred heading to hide uncertainty or re-order content. If a heading conflicts with block order or appears to be a page header/footer, prefer the ordered source blocks and mark the boundary uncertain.

## 3. Chunk Sizing Strategy

Bound requests by the provider's token context and output budget, not by pages or characters alone. Page density, tables, formulas, language, and extraction format make page and character counts unreliable proxies for tokens.

For each request, reserve the configured model context for all components: instructions, source labels and locations, primary content, supplemental context, requested output schema, and generated answers/explanations. Leave an explicit reserve for output and provider framing. The source allowance is the remaining input budget after those reservations; it must stay below the provider's documented usable context limit. If a trustworthy tokenizer is unavailable, use a conservative estimate and smaller limits rather than treating character count as an exact token count.

Use these sizing rules:

- Establish a conservative default source-token ceiling for the selected provider/model and request shape. The ceiling is configurable as an operational policy, not a promise that every provider can accept the same amount.
- Split oversized sections at paragraph or other coherent block boundaries. Re-evaluate actual request size after adding labels, instructions, and context.
- Reserve output capacity based on the requested maximum number and complexity of proposals. Reduce the proposal cap or split the unit if the output budget cannot accommodate complete questions, answers, explanations, and references.
- Keep context supplements small and explicit. Include only context needed to interpret the primary unit; do not duplicate an entire neighboring section “just in case.”
- Never rely on provider truncation. If a request exceeds the local limit, split or decline it before sending and report why.
- Retry only the failed unit when possible. A retry may use a smaller partition or adjusted output cap, but must retain the same source revision and preserve completed results.

The prototype's 6,000-character and ten-proposal limits are an experiment-specific ceiling, not a general production sizing rule. Production limits should be evaluated against actual provider tokenization, response completeness, document types, latency, cost, and extraction quality. A long PDF may therefore yield many modest requests; a short, dense page may still need splitting.

## 4. Multi-File Handling

Treat each uploaded file as an independent source with its own stable source identity, revision, ordered blocks, extraction diagnostics, and locations. The user-selected set of files forms one generation scope for a specific StudyPlan, but does not erase per-file provenance.

Prepare files independently first:

- Extract and normalize each file with its format-specific adapter.
- Retain file order selected by the user, while preserving internal document order. Do not infer chronology or authority from filenames.
- Record extraction completeness, skipped or unsupported content, and OCR/layout uncertainty per source.
- Exclude files or regions the user did not select and do not add other course resources automatically.

Then build a combined coverage view across the selected sources. Segment each file using its own structure. A generation unit should normally come from one source and one contiguous source range; this limits cross-file confusion and makes citations precise. A small number of related blocks from different files may be packaged together only when the relation is explicit or needed to resolve a user-selected comparison. Label each block with its source identity and location, and require every proposal to cite the relevant blocks in each source.

Do not concatenate separate files into one apparent document, silently prefer one file when sources disagree, or merge their text into an untraceable paraphrase. If selected sources conflict or repeat material, preserve the conflict/repetition as a review signal. The model must not be asked to settle conflicting course statements by using outside knowledge. Generation may abstain or produce a clearly flagged proposal citing both passages for human resolution.

Reusing a source for a different StudyPlan is a separate, explicit generation run. The source can remain course-level and reusable, but the run and every proposal must target the one selected plan; content and learning progress do not transfer between plans.

## 5. Context-Window Management

Context-window management is deterministic packaging work performed before any AI request. No browsing, internet search, external retrieval, or unselected source material is permitted. Do not provide tools that allow the generation model to retrieve external information. A prompt instruction alone is not a technical guarantee that a model's pretrained knowledge will not influence its wording; only source-supported claims may be accepted.

For each bounded request:

- Include only selected blocks needed for the unit, plus minimal labeled context when necessary.
- Preserve source IDs, block IDs, and source locations alongside text so references can be resolved against exactly what was sent.
- Keep instructions and response requirements concise and consistent across units; account for them in the same input budget.
- Request a bounded number of complete proposals and allow zero proposals when evidence is insufficient. Do not force a target count by encouraging unsupported filler.
- Do not carry prior model-generated answers into later requests as factual context. If a later unit needs earlier course material, include the original selected source blocks with their citations.
- Do not assume conversational memory persists consistently across calls. Each unit must be interpretable from its own included content and context.

Cross-section context should be included only where needed, for example when a later paragraph refers to a definition introduced immediately before it. Mark those blocks as context and retain their original citations. If the required context would exceed the budget, split at a more coherent boundary, package a smaller selected range, or abstain; never remove a qualification just to fit.

Each request is an isolated, bounded attempt. Record whether it completed, failed, or returned unusable output at the unit level so a provider error cannot invalidate other completed units. Do not silently send a smaller or different source selection after failure.

## 6. Question-Coverage Strategy

Coverage is measured against selected, usable source regions and explicit user-selected objectives when available. It is not measured by raw proposal count, by the percentage of pages touched, or by model-reported confidence. Heuristic section titles are not verified objectives.

Before generation, create an internal coverage map of selected structural regions and their generation units. Track each unit as unprocessed, completed with proposals, completed with no supportable proposals, failed, or excluded with a reason. This makes omissions visible and enables resumption without rerunning successful work.

Allocate generation attention across the selected material rather than letting long, easy-to-read sections consume every proposal. The allocation may consider explicit headings, user-selected objectives, distinct concepts, and how much usable evidence exists, but it must not equate section length with educational importance. Where objectives are absent, report coverage in terms of source regions and do not invent objective coverage claims.

After local generation, inspect coverage across the whole selected scope for:

- Selected sections or sources with no processing result.
- Important selected regions that received no proposals, distinguishing deliberate abstention from failure.
- Excessive repetition of one fact or section while other selected regions are untouched.
- Redundancy across neighboring chunks and multiple files.
- Supported variety in question focus and application level, without manufacturing variety unsupported by the material.

Coverage gaps are diagnostic signals for selective follow-up, not instructions to fabricate questions. Users may choose to add source regions or request another bounded pass. Preserve the result of each pass and distinguish new proposals from existing, edited, approved, or rejected items.

## 7. Proposal Merging Strategy

Generation returns candidate proposals per bounded unit. Normalize and validate each result against the exact submitted blocks before combining anything. Model-returned block identifiers must resolve to blocks in that request; application-assigned source identity, location, run provenance, and plan ownership remain authoritative.

Merge in stages:

1. **Within-unit validation:** reject malformed or unsupported records and flag proposals whose cited evidence is missing, unknown, or outside the submitted unit and its explicit context.
2. **Stable association:** retain the source revision, generation run, unit identity, provider/model metadata when applicable, and per-unit completion status with each candidate.
3. **Exact duplicate detection:** identify identical normalized prompts and repeated outputs deterministically. Do not discard records without preserving their origins.
4. **Cross-unit similarity review:** flag likely paraphrases or overlapping questions for comparison across the selected scope. Semantic similarity is advisory; two prompts about the same concept may test different useful details or application levels.
5. **Conflict handling:** keep disagreements in answer, explanation, or cited evidence visible. Do not average, vote, or silently choose one proposal or source as correct. Route uncertain and contradictory cases to review or reject them as unsupported.
6. **Incremental consolidation:** add successful unit results without overwriting user edits or prior review decisions. A retry of an unchanged unit should be recognizable as the same work; changed source content or changed generation settings should be distinguishable as a new revision/run.

The consolidated set remains a proposal bank, not an active question catalog. Preserve duplicate/similarity signals and the source proposals that contributed to a merged or superseded candidate so reviewers can inspect the evidence and decide whether to retain, edit, combine, or reject. Never merge solely to hit a requested question count. Explicit human review and approval remain necessary for every generated question entering the StudyPlan.

## 8. Source Attribution Strategy

Attribution must be preserved from extraction through segmentation, generation, merging, and review. Every candidate should identify one or more supporting source blocks sufficient to inspect the claims in its prompt, answer, and explanation.

For each reference, retain as available:

- Stable source/resource identity, original filename, and source revision or content hash.
- Stable block identity within that extraction revision and its block kind.
- Format-specific location: PDF page and paragraph/line, DOCX heading/paragraph/table cell, PPTX slide and shape/table position, or TXT line/offset.
- A compact evidence excerpt or equivalent displayable evidence, tied to the cited block rather than reconstructed from the whole document.
- Relevant extraction warnings or confidence, including OCR and reading-order uncertainty.

Treat locations as revision-scoped: page or block number alone may point to different content after a file is replaced or re-extracted. Keep original and re-extracted source revisions distinct. If the source binary or full extracted text is not retained, identify that limitation honestly; a citation may remain useful provenance but must not imply that the original can still be opened.

The model may nominate evidence block IDs only from the submitted content. Grade Quest resolves those IDs against the request's immutable block set and attaches authoritative locations; unknown or ambiguous IDs are rejected or flagged. Do not trust model-generated page numbers, filenames, source IDs, or plan ownership. Where evidence is split across multiple blocks, keep each reference separately and preserve the relationship to its source.

Chunk overlap and context supplements can cause the same source block to appear in multiple requests. Preserve each proposal's actual evidence references and request provenance, then deduplicate repeated references during presentation without losing the originating unit records. An overlap block is not a second independent coverage result.

## 9. Risks

| Risk | Effect | Architectural response |
| --- | --- | --- |
| A character/page limit is mistaken for a model context limit. | Requests truncate or leave no room for complete answers. | Budget using tokens where possible; reserve output and instruction capacity; preflight every request. |
| Heuristic sectioning is treated as semantic truth. | Questions are misgrouped or coverage is overstated. | Preserve boundary origin/confidence; use heuristics for navigation only; report source regions when objectives are unknown. |
| Chunk boundaries remove definitions, conditions, or examples. | Questions become ambiguous or answers become overgeneralized. | Split at coherent block boundaries, include minimal labeled context, and abstain when required context cannot fit. |
| Large files produce too many requests or noisy proposals. | Cost, latency, review burden, and memory use grow without quality gains. | Require explicit source selection, bound unit size/output, process incrementally, and make coverage rather than count the goal. |
| Multiple files are concatenated without source identity. | Incorrect attribution and confusion when sources disagree. | Package primarily per source; label every block; cite conflicts; never silently resolve contradictions. |
| Overlap or reprocessing creates duplicate questions. | Review queues inflate and coverage is misreported. | Track unit identity/revision, de-duplicate exact repeats, flag semantic similarity, and retain origins. |
| A failed request is treated as an empty successful result. | Selected content silently disappears from coverage. | Track failure separately from completed abstention and allow unit-level retry. |
| Model citations are plausible but invalid. | Reviewers cannot verify the evidence or may trust false references. | Resolve only against submitted block IDs and attach locations in application-controlled processing. |
| OCR, tables, formulas, diagrams, or reading order are inaccurate. | Proposals may be grounded in corrupted extraction. | Carry extraction diagnostics with every block; exclude or flag uncertain content; do not claim unsupported visual understanding. |
| Source content is sent externally without informed choice. | Privacy, consent, policy, or cost failures. | Make provider and transfer explicit; send selected bounded text only; never silently change provider or destination. |
| Valid formatting is mistaken for correctness or grounding. | Incorrect questions enter study material. | Treat structural checks and citation resolution as necessary but insufficient; retain source-based human approval. |
| Source revisions invalidate old locations. | References point to changed or unavailable content. | Bind locations to immutable extraction revisions and disclose retention limitations. |

## 10. Recommended Architecture

Adopt a **structure-aware, token-bounded, source-preserving packaging pipeline** between canonical document extraction and AI generation:

```text
User-selected files and regions
              |
              v
Independent extraction per source
              |
              v
Ordered, source-addressable blocks
  + structure origin/confidence
  + extraction warnings
              |
              v
Section and coverage map
              |
              v
Coherent token-bounded generation units
  + minimal labeled context
  + exact block/location manifest
              |
              v
One isolated AI request per bounded unit
              |
              v
Resolve evidence and validate each result
              |
              v
Incremental cross-unit deduplication and conflict flags
              |
              v
Source-attributed proposal bank for human review
```

Process each file independently through the shared extraction boundary, then combine only at the coverage and proposal-consolidation stages. Prefer a generation unit from one contiguous source range. Use explicit format structure first, clearly mark inferred headings, and fall back to source-order blocks when structure is uncertain. Determine request size from a conservative provider-specific token budget that reserves room for instructions and complete output; split only at meaningful boundaries and never rely on model-side truncation.

Track processing and coverage per unit so large documents can be resumed and failed units retried without repeating completed work. Generate locally from selected material only, with no browsing, internet search, external retrieval, or implicit carry-over from prior model calls. Validate every citation against the exact submitted blocks, retain source revisions and extraction warnings, and consolidate incrementally without overwriting human decisions. Similarity and coverage checks should expose gaps and redundancy, not force a target number of questions or silently resolve disagreements.

The result is always a source-attributed proposal set pending human review. Packaging improves request reliability and traceability; it cannot guarantee extraction fidelity, semantic correctness, or immunity to a model's pretrained knowledge. Source evidence, honest uncertainty, and explicit approval remain essential before any proposal becomes StudyPlan content.