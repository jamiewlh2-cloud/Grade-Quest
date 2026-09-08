// pdfImport/previewModal.js

function ensureOverlay() {
    let overlay = document.getElementById('pdfImportPreviewOverlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'pdfImportPreviewOverlay';
    overlay.tabIndex = -1;
    overlay.style.cssText = [
        'position:fixed',
        'inset:0',
        'display:none',
        'align-items:center',
        'justify-content:center',
        'background:rgba(15,23,42,0.72)',
        'z-index:99999',
        'padding:24px'
    ].join(';');

    overlay.innerHTML = `
        <div style="width:min(1040px,100%); max-height:90vh; overflow:auto; background:#ffffff; color:#0f172a; border-radius:22px; box-shadow:0 30px 100px rgba(15,23,42,0.35); padding:20px;">
            <div style="display:flex; justify-content:space-between; gap:12px; align-items:center; margin-bottom:16px; flex-wrap:wrap;">
                <div>
                    <div style="font-size:0.8rem; letter-spacing:0.12em; text-transform:uppercase; color:#64748b;">Hybrid Syllabus Importer</div>
                    <h3 style="margin:4px 0 0;">Review the extracted assessments</h3>
                </div>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button type="button" data-preview-action="use-parser" class="button-secondary">Use Parser</button>
                    <button type="button" data-preview-action="use-ai" class="button-primary">Use AI</button>
                    <button type="button" data-preview-action="add-row" class="button-secondary">Add Row</button>
                    <button type="button" data-preview-action="cancel" class="button-secondary">Cancel</button>
                    <button type="button" data-preview-action="save" class="button-primary">Approve Import</button>
                </div>
            </div>
            <div data-preview-summary style="margin-bottom:12px;"></div>
            <div data-preview-details style="margin-bottom:12px; color:#334155;"></div>
            <div data-preview-status style="margin-bottom:12px; padding:10px 12px; border-radius:12px; background:#f8fafc; color:#334155;"></div>
            <div data-preview-list style="display:flex; flex-direction:column; gap:12px;"></div>
        </div>
    `;

    document.body.appendChild(overlay);
    return overlay;
}

window.PreviewModal = {

    async show(data, options = {}) {

        function normalizeText(text) {
            return String(text || '').replace(/\s+/g, ' ').trim();
        }

        function normalizeAssessment(assessment) {
            if (!assessment) return null;

            const name = normalizeText(assessment.name);
            const weight = assessment.weight !== '' && assessment.weight != null
                ? Number(assessment.weight)
                : null;
            const dueDate = normalizeText(assessment.dueDate);

            if (!name && weight == null && !dueDate) return null;

            return {
                name,
                weight: Number.isNaN(weight) ? null : weight,
                dueDate: dueDate || ''
            };
        }

        function normalizeAssessments(items) {
            return (Array.isArray(items) ? items : [])
                .map(normalizeAssessment)
                .filter(Boolean);
        }

        function totalWeight(items) {
            return normalizeAssessments(items).reduce((sum, item) => {
                return sum + Number(item.weight || 0);
            }, 0);
        }

        function escapeHtml(text) {
            return String(text || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function createEmptyAssessment() {
            return {
                name: '',
                weight: '',
                dueDate: ''
            };
        }

        function sumAssessmentWeight(items) {
            return normalizeAssessments(items).reduce((sum, item) => {
                return sum + Number(item.weight || 0);
            }, 0);
        }

        const parserAssessments =
            normalizeAssessments(
                data.parserResult && Array.isArray(data.parserResult.assessments)
                    ? data.parserResult.assessments
                    : []
            );

        const aiAssessments =
            normalizeAssessments(
                data.aiResult && Array.isArray(data.aiResult.assessments)
                    ? data.aiResult.assessments
                    : []
            );

        const incomingAssessments = normalizeAssessments(
            Array.isArray(data.assessments) ? data.assessments : []
        );

        const hasAiResult = aiAssessments.length > 0;
        let selectedSource = data.previewSource || (hasAiResult ? 'ai' : 'parser');
        let workingAssessments = incomingAssessments.length
            ? incomingAssessments.slice()
            : hasAiResult
                ? aiAssessments.slice()
                : parserAssessments.slice();

        if (!workingAssessments.length) {
            workingAssessments = [createEmptyAssessment()];
        }

        const diagnostics = Array.isArray(data.diagnostics && data.diagnostics.warnings)
            ? data.diagnostics.warnings
            : [];

        const courseCode = data.course && data.course.courseCode
            ? data.course.courseCode
            : 'Unknown';

        const overlay = ensureOverlay();
        const summaryNode = overlay.querySelector('[data-preview-summary]');
        const detailsNode = overlay.querySelector('[data-preview-details]');
        const statusNode = overlay.querySelector('[data-preview-status]');
        const listNode = overlay.querySelector('[data-preview-list]');

        const modeLabel = String(options.modeLabel || '').trim();
        const modeBadge = modeLabel
            ? `<span style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:999px; padding:4px 10px; font-size:0.72rem; text-transform:uppercase; letter-spacing:0.09em; color:#0f172a;">${escapeHtml(modeLabel)}</span>`
            : '';

        function renderSummary() {
            const parserWeight = totalWeight(parserAssessments).toFixed(2);
            const aiWeight = totalWeight(aiAssessments).toFixed(2);
            const activeWeight = totalWeight(workingAssessments).toFixed(2);

            summaryNode.innerHTML = `
                <div style="display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:10px; margin-bottom:14px;">
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:12px;">
                        <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.12em; color:#64748b;">Parser</div>
                        <div style="font-size:1.2rem; font-weight:800; margin-top:4px;">${parserAssessments.length} items</div>
                        <div style="color:#475569; margin-top:2px;">${parserWeight}% total</div>
                    </div>
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:12px;">
                        <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.12em; color:#64748b;">AI</div>
                        <div style="font-size:1.2rem; font-weight:800; margin-top:4px;">${aiAssessments.length} items</div>
                        <div style="color:#475569; margin-top:2px;">${aiWeight}% total</div>
                    </div>
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:12px;">
                        <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.12em; color:#64748b;">Selected</div>
                        <div style="font-size:1.2rem; font-weight:800; margin-top:4px;">${selectedSource === 'ai' ? 'AI' : 'Parser'}</div>
                        <div style="color:#475569; margin-top:2px;">${workingAssessments.length} editable row(s)</div>
                    </div>
                </div>
            `;

            detailsNode.innerHTML = `
                <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px; color:#334155;">
                    ${modeBadge}
                    <span style="background:#e2e8f0; border-radius:999px; padding:4px 10px;">${escapeHtml(courseCode)}</span>
                    <span style="background:#e2e8f0; border-radius:999px; padding:4px 10px;">Active total ${activeWeight}%</span>
                    <span style="background:#e2e8f0; border-radius:999px; padding:4px 10px;">Parser confidence ${data.parserConfidence ? Number(data.parserConfidence.score || 0).toFixed(2) : '0.00'}</span>
                </div>
                <div style="color:#475569; line-height:1.5;">${hasAiResult ? 'AI output is loaded by default. Switch back to the parser result if you want to compare the extraction sources.' : 'The parser output is being used directly because the AI fallback did not return usable JSON.'}</div>
            `;

            if (diagnostics.length) {
                statusNode.innerHTML = `
                    <strong>Warnings</strong><br>
                    ${diagnostics.map(warning => `- ${escapeHtml(warning)}`).join('<br>')}
                `;
            } else {
                statusNode.textContent = 'Ready for review.';
            }
        }

        function renderList() {
            listNode.innerHTML = workingAssessments.map((assessment, index) => {
                const name = escapeHtml(assessment.name || '');
                const weight = assessment.weight != null ? assessment.weight : '';
                const dueDate = escapeHtml(assessment.dueDate || '');

                return `
                    <div data-preview-row="${index}" style="border:1px solid #e2e8f0; border-radius:16px; background:#ffffff; padding:14px; box-shadow:0 8px 22px rgba(15,23,42,0.05);">
                        <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start; margin-bottom:10px; flex-wrap:wrap;">
                            <div>
                                <div style="font-weight:800; color:#0f172a;">Assessment ${index + 1}</div>
                                <div style="font-size:0.85rem; color:#64748b; margin-top:3px;">Editable assessment row</div>
                            </div>
                            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                                <button type="button" data-preview-action="remove-row" data-preview-index="${index}" class="button-secondary">Remove</button>
                            </div>
                        </div>
                        <div style="display:grid; gap:10px; grid-template-columns:minmax(0, 1.5fr) 120px minmax(0, 1fr);">
                            <label style="display:block;">
                                <span style="display:block; font-size:0.8rem; color:#64748b; margin-bottom:4px;">Name</span>
                                <input data-preview-field="name" data-preview-index="${index}" type="text" value="${name}" style="width:100%;">
                            </label>
                            <label style="display:block;">
                                <span style="display:block; font-size:0.8rem; color:#64748b; margin-bottom:4px;">Weight</span>
                                <input data-preview-field="weight" data-preview-index="${index}" type="number" step="0.1" value="${weight}" style="width:100%;">
                            </label>
                            <label style="display:block;">
                                <span style="display:block; font-size:0.8rem; color:#64748b; margin-bottom:4px;">Due date</span>
                                <input data-preview-field="dueDate" data-preview-index="${index}" type="text" value="${dueDate}" style="width:100%;">
                            </label>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function render() {
            renderSummary();
            renderList();
        }

        function updateField(index, field, value) {
            const item = workingAssessments[index];
            if (!item) return;

            if (field === 'name') {
                item.name = value;
                return;
            }

            if (field === 'weight') {
                item.weight = value === '' ? '' : Number(value);
                return;
            }

            if (field === 'dueDate') {
                item.dueDate = value;
            }
        }

        function buildFinalResult() {
            const approvedAssessments = normalizeAssessments(workingAssessments);

            return {
                assessments: approvedAssessments,
                totalWeight: sumAssessmentWeight(approvedAssessments),
                assessmentCount: approvedAssessments.length,
                source: selectedSource,
                approvedAt: new Date().toISOString()
            };
        }

        function replaceFromSource(source) {
            selectedSource = source;
            workingAssessments = source === 'ai'
                ? (aiAssessments.length ? aiAssessments.slice() : parserAssessments.slice())
                : parserAssessments.slice();

            if (!workingAssessments.length) {
                workingAssessments = [createEmptyAssessment()];
            }

            render();
        }

        return new Promise(resolve => {
            function close(result) {
                overlay.style.display = 'none';
                document.removeEventListener('click', clickHandler, true);
                document.removeEventListener('input', inputHandler, true);
                resolve(result);
            }

            function clickHandler(event) {
                const actionButton = event.target.closest('[data-preview-action]');
                if (!actionButton || !overlay.contains(actionButton)) {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();

                const action = actionButton.getAttribute('data-preview-action');
                const index = Number(actionButton.getAttribute('data-preview-index'));

                if (action === 'cancel') {
                    close(null);
                    return;
                }

                if (action === 'use-parser') {
                    replaceFromSource('parser');
                    return;
                }

                if (action === 'use-ai') {
                    replaceFromSource('ai');
                    return;
                }

                if (action === 'add-row') {
                    workingAssessments.push(createEmptyAssessment());
                    render();
                    return;
                }

                if (action === 'remove-row' && Number.isFinite(index)) {
                    workingAssessments.splice(index, 1);
                    if (!workingAssessments.length) {
                        workingAssessments.push(createEmptyAssessment());
                    }
                    render();
                    return;
                }

                if (action === 'save') {
                    const approved = normalizeAssessments(workingAssessments);

                    if (!approved.length) {
                        statusNode.textContent = 'Add at least one assessment before saving.';
                        return;
                    }

                    if (approved.some(item => !item.name)) {
                        statusNode.textContent = 'Every saved assessment needs a name.';
                        return;
                    }

                    close({
                        parserResult: data.parserResult || null,
                        aiResult: data.aiResult || null,
                        source: selectedSource,
                        finalApprovedResult: buildFinalResult(),
                        assessments: approved
                    });
                }
            }

            function inputHandler(event) {
                const field = event.target.getAttribute('data-preview-field');
                const index = Number(event.target.getAttribute('data-preview-index'));

                if (!field || !overlay.contains(event.target) || !Number.isFinite(index)) {
                    return;
                }

                updateField(index, field, event.target.value);
            }

            overlay.style.display = 'flex';
            overlay.focus();
            render();
            document.addEventListener('click', clickHandler, true);
            document.addEventListener('input', inputHandler, true);
        });

    }

};