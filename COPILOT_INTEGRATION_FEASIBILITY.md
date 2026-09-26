# Copilot Integration Feasibility

**Status:** Integration feasibility assessment; no implementation or generation redesign
**Scope:** Determine whether Microsoft Copilot or GitHub Models can supply question drafts for Grade Quest under the uploaded-material-only policy
**Assessed against:** `TEAM_CONTEXT.md`, `AI_GENERATION_STRATEGY.md`, `QUESTION_GENERATION_ARCHITECTURE.md`, `QUESTION_GENERATION_IMPLEMENTATION_PLAN.md`, and `AI_QUESTION_GENERATION_PROTOTYPE_PLAN.md`

## Executive Conclusion

Microsoft Copilot can realistically be the owner's primary question-drafting assistant through a deliberate, user-driven copy/paste workflow. The owner can provide selected extracted course text in a Copilot conversation, request source-bounded question drafts, inspect the cited material, and bring acceptable drafts into Grade Quest as pending proposal records. This uses Copilot as a human-operated authoring tool; it is not a direct application integration, and the handoff and review remain manual.

The owner's McMaster-provided Copilot access should **not** be treated as an API entitlement for automated Grade Quest generation. A Copilot chat subscription or institutional sign-in does not, by itself, establish that a third-party static web app can invoke the same Copilot experience, obtain structured responses, disable all external grounding, or use the service programmatically. The current app has no server-side inference boundary. Until an applicable supported API, institutional permission, and data-handling terms are verified, an automated Copilot-backed provider is not a realistic assumption.

GitHub Models is a more direct *technical* candidate for automated model inference because it is a model API offering rather than the GitHub Copilot chat product. It is separate from Copilot: Copilot access does not establish GitHub Models API access, quota, or production rights. It would still require eligibility and terms verification, a safe credential boundary, explicit disclosure of remote transfer, and the existing proposal/review gates. For personal use, the practical recommendation is to start with Copilot manually; consider GitHub Models only if automation becomes important and the account/API terms and secure hosting are acceptable.

This assessment uses the supplied project documents and does not verify current vendor product terms, McMaster tenant settings, or account entitlements. Those details can change and must be checked in the actual account before any automated or sensitive-material workflow is relied upon.

## 1. Current Architecture Compatibility

Grade Quest's architecture is compatible with AI-produced questions at the **proposal-record boundary**, not with a specific Copilot product integration:

- A generation run targets an existing `StudyPlan`; Grade Quest, not the model, assigns `studyPlanId`, proposal identity, source references, provenance, and pending-review status.
- Candidate questions remain separate from active questions and the deterministic learning engine until the user explicitly approves them.
- The source policy permits only selected, uploaded course material. No web browsing, internet search, external retrieval, or unselected documents are permitted for generation.
- Extracted blocks and source locations are intended to travel with proposals so the user can check evidence. A prompt or citation is not proof of semantic correctness; human review remains necessary.
- The application is a static browser client. It has no general server-side model-inference service or secure place for a shared provider secret. A hosted model call cannot safely be implemented by embedding a provider key in the client.
- PDF extraction is the present reusable path. DOCX, PPTX, TXT, and future OneNote exports are source-format goals, not all established extraction capabilities. A Copilot workflow can consume manually selected text from any format the owner can read, but this does not make those formats integrated or reliably extractable by Grade Quest.

Thus manually produced Copilot output can be represented by the existing proposal concept, but a fully automated path needs more than an output schema: it needs an authorized invocation route, data-transfer controls, and a secure credential/service boundary.

## 2. Possible Copilot Integration Approaches

| Approach | Feasibility | What it means for Grade Quest |
| --- | --- | --- |
| **Copilot Chat, manual handoff** | Practical now for personal use, subject to McMaster account policy and the controls available in that Copilot experience. | The owner supplies a bounded excerpt and instructions, then manually reviews and transfers selected drafts into Grade Quest as proposals. No Copilot API or app credential is involved. This is the strongest near-term fit. |
| **GitHub Copilot in an IDE, manual handoff** | Possible as another user-operated drafting surface, but not an in-app integration. | The owner provides selected material in an IDE chat and transfers results manually. It adds little over Copilot Chat for routine study-plan use and may place course text in a different service context. It should not be assumed to offer a supported runtime endpoint for Grade Quest. |
| **Copilot Studio agent or workflow** | Potentially automatable, but conditional and operationally heavier. | An agent or workflow could be configured to accept material and return structured output, potentially through a connector or service. It is a separately configured product path, not an automatic capability of a Copilot Chat subscription. Licensing, tenant administrator approval, connector availability, data location/retention, tool restrictions, and secure communication with Grade Quest would all need verification. It may be disproportionate for a personal app. |
| **Microsoft model API (for example, an Azure-hosted model service)** | Technically plausible as a remote provider, but it is not the user's Copilot chat service. | It would require separate resource access, credentials, billing/quota, and a secure backend or supported user authorization. It could provide a structured generation endpoint, but should be described as a Microsoft model-service integration, not as using the Copilot subscription. |

A manually operated Copilot session can be primary for the owner without being the primary *software provider*. The distinction matters: a human can move selected content and proposals across the boundary, while the application itself cannot assume it can call Copilot.

## 3. Possible GitHub Models Integration Approaches

GitHub Models should be evaluated separately from GitHub Copilot:

- **Manual model playground/chat use:** If the owner's account offers an interactive model experience, it can be used like Copilot Chat for draft generation. This remains a manual workflow and must be checked for the same uploaded-material, no-browsing, and data-policy requirements.
- **Direct model API through a secured service:** A backend could send selected extracted blocks to an eligible GitHub Models endpoint and normalize the response into Grade Quest proposals. This is the most direct route among the named options for automated model calls, but it is not supplied merely by having GitHub Copilot through McMaster. Account authorization, model availability, rate limits, API terms, data handling, and suitability for the intended use must be confirmed.
- **Direct browser-to-API call:** This is not an acceptable default for a shared secret or personal access token. Browser code and browser storage are inspectable; a token placed there can be copied or abused. A user-provided token in the client still creates exposure and revocation risks and does not solve provider policy, consent, or cost controls. A remote API should use a secured service boundary or a provider-supported user authorization design appropriate to the account.

GitHub Models may be viable if the goal becomes one-click generation and a secure service is acceptable. Its model catalog, endpoint behavior, and terms can differ by model and evolve over time. API availability and limits should be checked for the actual account; this document does not assume free inference, unlimited quota, or that a Copilot plan includes it.

## 4. Practical Limitations

1. **Copilot is not automatically an embeddable API.** The user-facing Copilot experience and an API for third-party applications are distinct product capabilities. A university-provided chat entitlement is not evidence of programmatic access.
2. **No-browsing is a hard acceptance condition.** Manual prompts can request use of only pasted text, but prompts alone cannot prove that a service did not use prior knowledge or other context. For automated use, the invocation must expose and enforce appropriate tool/grounding controls; if it cannot, the workflow cannot claim external retrieval is technically disabled. Any externally sourced factual claims must be rejected regardless.
3. **Structured proposal output is not guaranteed by ordinary chat.** The owner may need to correct or reformat responses. A future adapter could parse a supported structured response, but it must reject malformed or untraceable output rather than silently turn it into active content.
4. **Evidence citations need to map to submitted blocks.** A model-generated page or paragraph citation is not trustworthy unless Grade Quest can resolve it against the exact submitted selection. In the manual workflow, the owner should retain the excerpt alongside each draft and verify it directly.
5. **File coverage is constrained by extraction.** Copilot may accept material manually copied from formats Grade Quest does not yet extract, but that is not equivalent to an integrated PDF/PPTX/DOCX/TXT/OneNote pipeline. Layout, diagrams, tables, formulas, OCR, and reading order can still impair quality.
6. **Manual transfer is labor.** Copying text and reviewing output can be reasonable for one person's selected study material, but it will not scale to large documents, repeated batches, or unattended generation.
7. **Institutional access is not necessarily personal-use permission for every data type.** McMaster account configuration and course-material rules may govern which content can be submitted and how it is handled. The exact entitlement and policy are unknown here.

## 5. User-Driven Workflows

**Recommended personal workflow:**

1. In Grade Quest, select an existing StudyPlan and a small relevant portion of uploaded/extracted course material. Use only sources the owner is authorized to process.
2. Send only that bounded text to the owner's approved Copilot experience. Ask for a small number of questions and answers strictly supportable by the supplied excerpt, request the supporting excerpt for each, and ask it to abstain when the evidence is insufficient. Do not use browsing, search, external sources, or unrelated chat context.
3. Inspect every draft against the actual uploaded material. Reject unsupported, ambiguous, redundant, or extraction-dependent items; do not treat Copilot's confidence or a citation as verification.
4. Transfer accepted drafts into Grade Quest as `pending-review` proposal records, preserving source references and recording Copilot as user-supplied provenance where the workflow supports it. Grade Quest assigns the plan ownership and lifecycle state. Approve each item only through its normal review boundary.

The existing product documents describe the proposal architecture; they do not establish that a complete manual-import/review UI is already available. Until it is, the handoff is an owner workflow rather than a feature claim. OneNote content should likewise be exported or copied into a supported, inspectable form first; future OneNote exports do not change the provider feasibility.

## 6. Automated Workflows

An automated workflow is possible in principle only if a supported model API or configured agent endpoint is available and approved. The flow would have to preserve the existing boundaries: Grade Quest selects bounded source blocks; a secured service invokes the chosen provider with no browsing/retrieval tools; a parser maps evidence to submitted blocks; Grade Quest assigns plan/proposal metadata; and all returned items remain pending review.

For **Microsoft Copilot specifically**, no direct automated integration can be concluded from the provided McMaster Copilot access. It becomes feasible only if the owner or institution can identify a supported API/agent route that permits this use, returns suitable output, restricts external retrieval as required, and has acceptable data and licensing terms. Copilot Studio or a separate Microsoft model API may be investigated as distinct services, but neither should be represented as included in the Copilot entitlement without verification.

For **GitHub Models**, API-based generation is a plausible technical route, conditional on verified account access and terms. It requires a protected credential and remote service boundary; it is not a browser-only feature. In either case, no provider may be silently substituted after a failure, and automation must not bypass proposal validation, source checking, or user approval.

## 7. Security Considerations

- Course slides, notes, assignments, and OneNote exports may contain personal, licensed, unpublished, or institution-restricted material. Before sending content to Copilot or GitHub Models, determine whether McMaster and the source material's terms allow that transfer.
- An institutional sign-in or product label alone does not establish the applicable retention, model-training, logging, residency, or administrator-access terms. Verify those terms for the actual tenant, product, and account. Do not make a privacy promise based on an assumed entitlement.
- Minimize each request: send only selected content necessary for the requested questions; omit student identity, account details, unrelated course records, and entire source collections where a smaller passage suffices.
- Manual chat reduces application credential exposure but does not eliminate provider-side data processing. The user should know which service receives the content and clear unrelated conversational context where feasible.
- Never place a shared API secret in Grade Quest's static JavaScript, HTML, or service worker. If an automated remote integration is used, secure credentials server-side or use a documented user-authorization flow with appropriately constrained permissions.
- Avoid retaining full prompts, source text, and raw model transcripts by default. Keep only the evidence/provenance needed for review and explain when a source can no longer be reopened.
- Treat returned text as untrusted input. Validate schemas, escape rendered content, reject unknown source references, and keep proposals isolated from schedulable questions until explicit approval.

## 8. Cost Considerations

- **Copilot manual use:** The owner's university access may already cover the interactive product, so there may be no incremental per-request charge to Grade Quest. This is not guaranteed by the project documents; account terms, usage limits, and entitlement should be checked. The owner's time and manual review are the main visible workflow costs.
- **Copilot automation:** Do not assume the existing subscription covers API calls, Copilot Studio, connectors, or service hosting. These may involve separate licensing, usage charges, administrative work, or limits.
- **GitHub Models:** Do not assume that GitHub Copilot access includes GitHub Models inference or that a model/API is free or unlimited. Check current account-specific quotas, model pricing/terms, and rate limits before use. A hosted proxy also has compute, monitoring, and maintenance costs.
- **Quality controls:** Larger excerpts and repeated generation consume more usage and increase review time. Bounded user-selected material and a modest number of proposals align cost with useful output. A second model review would add another data transfer and usage cost and is not needed to make Copilot the primary manual drafting assistant.

## 9. Risks

| Risk | Effect | Feasibility response |
| --- | --- | --- |
| Copilot chat access is mistaken for a callable API. | The proposed in-app workflow cannot be built or may depend on unsupported access. | Treat current Copilot access as manual-only until an explicit supported API/agent entitlement is verified. |
| Prompt instructions are mistaken for a no-retrieval guarantee. | Drafts may rely on outside information despite the uploaded-only policy. | Do not enable or invoke browsing/search; inspect claims against submitted evidence and disclose that model priors cannot be erased. Reject unsupported content. |
| University policy or provider terms prohibit a particular upload or use. | Privacy, licensing, or institutional compliance failure. | Verify account and material rules before use; submit only authorized, minimized excerpts. |
| Provider returns plausible but incorrect content. | Students may rehearse false or incomplete answers. | Require source-linked human review; structural parsing and model agreement are not correctness proof. |
| Automated credentials are exposed in the static client. | Unauthorized requests, data exposure, and unexpected charges. | Do not embed secrets; require a secure service or suitable documented authorization flow. |
| Provider access, model, limits, or terms change. | Workflow stops working or changes cost/privacy characteristics. | Verify current access before committing; retain a manual/no-AI path and do not silently change providers. |
| Manual proposal transfer loses citations or plan identity. | A draft is detached from evidence or assigned to the wrong StudyPlan. | Preserve evidence with each draft; have Grade Quest assign `studyPlanId` and proposal metadata, then review before approval. |
| Future document formats are assumed to be supported because Copilot can read them. | Extraction and traceability gaps are hidden. | Distinguish manual content sharing from Grade Quest format support; keep source locations and extraction warnings authoritative. |

## 10. Recommendation

**Use McMaster-provided Microsoft Copilot as the owner's primary question-drafting assistant through a user-driven workflow, if the university's applicable terms permit the selected course material to be submitted. Do not plan around the Copilot subscription as Grade Quest's automated primary engine.** For the stated personal-use goal, manual transfer is realistic and prioritizes question quality without requiring a new backend or claiming an unsupported Copilot API integration.

Keep Copilot output as proposed content only: use selected uploaded excerpts, prohibit browsing and external retrieval in the workflow, verify every answer against its cited source, and preserve the existing `StudyPlan` ownership and explicit approval boundary. Where the manual surface cannot preserve source evidence or pending status, do not treat the output as an approved Grade Quest question.

If one-click automation later becomes important, evaluate GitHub Models as a separate conditional API option and investigate a Microsoft model API or Copilot Studio route only as separately licensed/configured services. Proceed only after verifying account access, API/agent support, retrieval controls, institutional permission, provider data terms, usage cost, and a secure invocation boundary. On current evidence, **Copilot is a realistic primary human-operated assistant; automated Copilot-backed generation is unproven, while GitHub Models is technically more plausible but entitlement- and security-dependent.**