# AI Generation Strategy

**Status:** Product and architecture recommendation
**Scope:** AI provider strategy for generating study-plan question proposals from uploaded course materials
**Related sources:** `TEAM_CONTEXT.md`, `QUESTION_GENERATION_ARCHITECTURE.md`, `QUESTION_GENERATION_IMPLEMENTATION_PLAN.md`, `STUDY_PLAN_CREATION_ARCHITECTURE.md`, and `LEARNING_ENGINE_ARCHITECTURE.md`

## 1. AI Generation Goals

Grade Quest's primary goal is to help students create useful, high-quality study plans from their own course materials. AI may reduce the work of turning those materials into questions, answers, and explanations, but it is a proposal mechanism, not the owner of learning decisions.

The strategy should:

- Prefer correctness, clarity, useful coverage, and source traceability over question count or fully offline operation.
- Let the owner choose among suitable providers over time without tying study-plan data or generation behavior to one vendor.
- Avoid training or fine-tuning custom machine-learning models. Use existing models where their capabilities, access terms, privacy, and cost are acceptable.
- Preserve a usable non-AI path: students can create an empty plan, author questions, and use already-approved questions if a provider is unavailable or declined.
- Keep questions and all learning progress owned by exactly one StudyPlan. AI output is not active learning content until reviewed and approved.
- Keep the adaptive learning engine deterministic. Models do not evaluate student responses, set mastery, schedule reviews, or determine learning outcomes.

Supporting multiple providers is worthwhile as an architectural capability because provider quality, access, price, privacy, and availability can change. It does not mean launching every provider at once or offering a provider catalog before the product needs one.

## 2. Source Material Constraints

Generation is grounded exclusively in material the user explicitly uploads or selects for the target study plan:

- Candidate sources include PDF lecture slides and notes, PowerPoint files, Word documents, OneNote exports, and future OCR text from images, subject to each format's extraction fidelity.
- The generator receives selected, extracted content blocks and their source locations, not an unrestricted request to answer from the open internet.
- Web browsing, internet search, external retrieval, and unselected documents are prohibited in the generation workflow. Providers must not be given browsing or search tools for this purpose.
- Questions, answers, and explanations must be supportable from the supplied material. The workflow must not require outside facts, assumed prerequisites, or current web knowledge to make an item answerable.
- Each proposal should identify supporting source passages or blocks. If the material is insufficient, ambiguous, contradictory, or extraction is uncertain, the appropriate result is a warning, a clarification request, or no proposal, not invented completion.
- Provider prompts and validation should instruct models to distinguish source statements from uncertainty and to abstain when evidence is insufficient.

This is an application-level grounding and acceptance policy, not a claim that a model can forget its training. A model may use its learned language and reasoning capabilities to interpret text, but no unsourced factual claim should be accepted as course content. Source references, user review, and explicit no-browsing controls are therefore essential; a prompt alone cannot prove that an answer is grounded.

## 3. Multi-Provider Architecture

Use one provider-neutral generation boundary. Study-plan creation, extraction, segmentation, proposal validation, review, persistence, and approval should not depend on a particular model vendor or local runtime.

The boundary accepts a bounded generation request containing selected canonical source blocks, source identifiers and locations, the target `studyPlanId`, desired question formats, and output constraints. It returns normalized candidate proposals plus provider/model provenance, source references, and diagnostics. A provider adapter handles that provider's request format, response parsing, capability declarations, and errors.

Deterministic Grade Quest code remains responsible for:

- Selecting and bounding the source material and preserving source identity and locations.
- Enforcing plan ownership, output schemas, supported answer types, structural checks, and proposal lifecycle.
- Checking that cited sources belong to the supplied material and that required evidence is present.
- Keeping proposals isolated from the active question repository until explicit approval.
- Handling provider failure without losing existing proposals or blocking manual study-plan use.

The abstraction should represent meaningful provider differences, including structured-output support, context limits, tool/browsing control, streaming, privacy characteristics, and whether the runtime is local or remote. It should not pretend all models have identical capabilities or quality. One canonical proposal contract and one review workflow are preferable to separate provider-specific study-plan formats.

Provider selection should be explicit and visible. Switching providers must not silently resend material, replace edited proposals, or bypass review. Each generation run should record the provider and model when available, settings/schema version, source selection, and time so results can be understood and compared.

## 4. Provider Abstraction Design

The provider abstraction is a boundary for exchangeability, not a promise that all vendors can be connected directly from the browser. It should separate these concerns:

- **Generation request:** selected source blocks, source references, target plan, requested formats, bounded output count, and grounding instructions.
- **Provider adapter:** authentication appropriate to the deployment, model invocation, provider-specific request/response mapping, timeouts, rate limits, and error normalization.
- **Normalized result:** proposals in a stable Grade Quest schema, citations to supplied source blocks, and provider/model metadata where available.
- **Capability and policy declaration:** local or remote execution, structured output, context size, tool access, data-retention controls, and known limitations. Unsupported guarantees must be disclosed, not inferred.
- **Quality gates:** deterministic structural and evidence checks followed by user review. Provider confidence scores, if present, are advisory and are not correctness scores.

The generation contract should not expose vendor-specific fields to the learning engine. Provider-specific features can be optional capabilities, but must not be required for basic plan creation or approval. Keep raw prompts and provider responses only when there is a clear diagnostic need; minimize retention of full course text and sensitive material.

The current application is a static browser client. A hosted provider's secret key must never be embedded in browser code. Any remote integration requires a suitable secured service or a provider-supported user authorization flow, together with explicit decisions about consent, retention, data location, and cost. The existing syllabus Ollama integration is local and assessment-specific; it is precedent for an optional local call, not a reusable question-generation provider or a hosted service.

## 5. Local AI Support

Local models, including Ollama, are valuable as an optional provider for users who want local processing, lower marginal request cost, or continued operation without internet after the model is installed. Local execution can reduce third-party transfer of source text, but it is not automatically private: the user's device, local runtime, logs, model source, and configuration still matter.

For this product, complete offline operation is secondary to question quality. Local AI should therefore be supported as a choice, not made the default quality ceiling or a prerequisite for study-plan generation. Local model capability varies substantially by model, hardware, context size, and structured-output reliability; a local result must pass the same evidence checks and human review as a remote result.

If no suitable local model is available, the app should report that clearly and leave the user able to choose a remote provider or continue without AI. It must not silently switch to a remote model after a local failure, because that changes the data destination and privacy expectation.

## 6. Remote AI Support

Remote models are appropriate when they provide materially better question quality, reasoning, document-context handling, or structured output than available local alternatives. Since the project owner prioritizes quality over complete offline operation, remote providers may be the preferred generation choice when the user has opted in and the privacy and cost terms are acceptable.

Remote processing sends course material outside the user's device. Make the provider and destination clear before transmission; send only the user's selected, bounded material; avoid unnecessary account/course details; and disclose relevant retention and usage terms. Do not promise that a provider will not retain or use data unless its applicable terms or configuration support that claim.

A hosted integration must use a secure credential boundary and account for service availability, rate limits, latency, data retention, cost controls, and user consent. Provider availability and product terms change over time, so specific products, including GitHub Copilot model access and Gemini, should be evaluated according to the applicable API, account, and redistribution terms rather than assumed to be interchangeable or available as embedded application services.

Remote outage, quota exhaustion, or user refusal must not block access to approved study content or manual authoring. Do not automatically fall back to a different destination or provider without the user's explicit choice.

## 7. Quality-Control Strategy

Quality control is layered; no single model call establishes correctness.

1. **Extraction quality:** retain source order and locations and surface limitations in tables, formulas, diagrams, slide layouts, OCR, and reading order. Poorly extracted content should not be treated as reliable merely because it is readable text.
2. **Grounding:** request evidence references for each prompt, answer, and explanation. Reject or flag claims that cannot be associated with supplied source content. Detect missing evidence; do not claim that an automated citation match proves semantic support.
3. **Deterministic validation:** require complete prompts, answer definitions, supported response shapes, valid plan ownership, source membership, and required explanation fields. Check malformed output, duplicates, answer leakage, and basic ambiguity indicators. Structural validity is not factual validity.
4. **Pedagogical review:** assess whether each item is answerable, appropriately scoped, useful rather than trivia, aligned to an intended concept, and not misleading. Pay special attention to calculations, causal claims, exceptions, and multiple-choice distractors.
5. **Coverage review:** consider source-section and objective coverage, redundancy, and question variety. A larger bank is not inherently a better bank.
6. **Human approval:** show evidence and extraction warnings near each proposal. Let the user edit, reject, or defer individual items. Only explicit approval moves content into the active StudyPlan catalog.

Do not present model self-reported confidence, a second model's approval, or a passed schema check as a guarantee of truth. Generated content remains a proposal until the user reviews it. The existing deterministic learning engine starts normal learning records only after approval; approval itself is not mastery evidence.

## 8. Cross-Provider Validation Possibilities

A primary generator plus a secondary AI validator can be useful in selected cases, but it should not be the default requirement for every proposal.

**Potential benefits:**

- A separately prompted model may identify unsupported claims, missing qualifications, ambiguous wording, incomplete answers, or implausible distractors that the generator overlooked.
- A different provider may offer useful diversity of critique and help prioritize items for closer human inspection.
- Comparing independent drafts or reviews can expose disagreements and indicate where the source or question needs user attention.

**Drawbacks and reliability limits:**

- A validator can confidently endorse a wrong answer, invent its own correction, or miss the same omission. If it sees the generator's answer first, it may anchor on it; if it sees only a source excerpt, it may still misinterpret the material.
- Providers can share training data, common model behaviors, or blind spots. Different vendor names do not establish independent judgment, and agreement does not prove correctness.
- The validator may introduce unsourced outside knowledge, so it must be bound to the same uploaded evidence and no-browsing policy. Its feedback is itself untrusted model output.
- A second call adds latency and cost and may send the same sensitive source text to another destination. It adds provider configuration, failure handling, provenance, conflict presentation, and review complexity.
- Model versions and behavior change. A validator score or pass result can be difficult to calibrate consistently and may create false confidence or encourage users to skip review.

**Complexity:** A basic sequential second call is technically modest, but a dependable validation feature is materially more complex than one generation call. It needs an independent review prompt, evidence-only inputs, normalized critique, conflict handling, provider-specific privacy consent, cost/latency controls, and a clear rule that disagreement routes to a person rather than being resolved by another opaque vote.

**Reliability:** Cross-provider review can improve defect detection as a triage signal, especially for high-impact or hard-to-check items, but it cannot certify correctness. Its value depends on evidence quality, reviewer independence, model capability, and the cost of false approval. Human review remains the final correctness gate.

A future cross-provider review mode could be opt-in or selectively invoked for flagged or higher-risk proposals. It should return specific evidence-linked concerns, not a bare pass/fail badge. The validator must not rewrite and activate questions automatically. Agreement may modestly increase confidence in prioritization, but must never bypass source review and explicit user approval.

## 9. Risks

| Risk | Effect | Architectural response |
| --- | --- | --- |
| Provider adds unsupported facts or omits source qualifications. | Students learn incorrect or overgeneralized content. | Require source evidence, flag unsupported content, validate deterministically, and keep explicit human approval. |
| No-browsing intent is treated as a prompt-only guarantee. | A tool-enabled provider may retrieve external information, or users may mistake model prior knowledge for uploaded evidence. | Disable browsing/search tools, use only selected source input, require evidence-linked answers, and state the limit of application-level grounding honestly. |
| Remote material transfer is unexpected. | Privacy, consent, institutional-policy, or trust failure. | Make destination and transfer explicit, minimize data, disclose retention terms, and never silently fall back between providers. |
| Hosted credentials are exposed in the static client. | Unauthorized usage, cost, and account compromise. | Require an appropriate secure service or supported user authorization; never ship provider secrets in browser code. |
| Provider/model capabilities or terms change. | Quality, availability, data handling, or cost may regress. | Keep adapters replaceable, record provenance, declare capabilities, and avoid vendor-specific learning data contracts. |
| Local model output is materially weaker or unreliable. | Poor questions despite local availability. | Make local use optional, apply identical quality gates, and make model limitations visible. |
| A validator agrees with a wrong generator answer. | False reassurance may reduce user scrutiny. | Treat validation as a triage signal only; retain evidence display and mandatory human approval. |
| Cross-provider review increases cost or exposes data to another company. | Increased expense and privacy surface with uncertain quality gain. | Do not require it; request separate consent and use selectively only where its benefit justifies the additional call. |
| Provider failure interrupts generation. | Lost work or blocked study-plan creation. | Keep proposal persistence and non-AI flows independent; report partial results and allow retries without replacing reviewed work. |
| Users mistake generated quantity or validator passes for quality. | Noisy banks and unwarranted confidence. | Emphasize source/objective coverage, uncertainty, and review decisions rather than count or model scores. |

## 10. Recommended Architecture

Adopt a **provider-neutral, user-authorized generation architecture with human approval**. Support multiple providers at the architectural boundary because Grade Quest should not be locked to one model and the owner values access to high-quality existing models. Provider choice should be a product option when a secure, policy-compliant integration exists, not a promise that every named provider can be used directly from the current static client.

The normal flow should be:

```text
Uploaded course material
          |
          v
Shared extraction with source locations and warnings
          |
          v
User-selected content and bounded segments
          |
          v
One selected AI generator (or no-AI path)
          |
          v
Evidence, schema, and deterministic quality checks
          |
          v
Question review and explicit user approval
          |
          v
Plan-owned StudyPlan question catalog
          |
          v
Existing deterministic learning engine
```

Prefer **Document -> AI Generator -> Question Review -> Study Plan**, with deterministic checks between generation and review, over a mandatory **Generator -> AI Validator -> Question Review** chain. A single generator plus source-grounded deterministic checks and visible evidence keeps the quality workflow understandable and avoids doubling calls, cost, latency, and data transfer for every item. The user remains the authority on whether source-supported questions are appropriate for their course.

A second provider is worthwhile as an optional, later quality-assurance capability for selected or flagged questions, especially where additional scrutiny has clear value. It should identify evidence-linked concerns for the user, not certify or automatically repair correctness. Cross-provider agreement must never replace human review or be used to bypass the approval boundary.

This approach supports the owner's preference for strong existing AI models without custom model training, preserves local Ollama as a possible privacy-oriented option, and accommodates future remote providers such as Gemini or eligible GitHub Copilot model access subject to their actual integration terms. It keeps uploaded material as the sole accepted factual source, preserves StudyPlan ownership, and leaves the existing deterministic engine and non-AI study workflows independent of provider choice.
