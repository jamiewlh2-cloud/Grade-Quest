// pdfImportLearningTest/ui/learningPreview.js

window.PDFImportLearningTest = window.PDFImportLearningTest || {};

(function (namespace) {
    const OVERLAY_ID = 'pdfImportLearningTestReviewOverlay';

    function normalizeText(text) {
        return String(text || '').replace(/\s+/g, ' ').trim();
    }

    function ensureOverlay() {
        let overlay = document.getElementById(OVERLAY_ID);
        if (overlay) return overlay;

        overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
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
            <div class="learning-review-card" style="width:min(980px,100%); max-height:90vh; overflow:auto; background:#ffffff; color:#0f172a; border-radius:20px; box-shadow:0 30px 100px rgba(15,23,42,0.35); padding:20px;">
                <div style="display:flex; justify-content:space-between; gap:12px; align-items:center; margin-bottom:16px;">
                    <div>
                        <div style="font-size:0.8rem; letter-spacing:0.12em; text-transform:uppercase; color:#64748b;">Experimental Learning Importer</div>
                        <h3 style="margin:4px 0 0;">Review extracted assessments</h3>
                    </div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button type="button" data-learning-action="run-regression" class="panel-btn">Run Regression Tests</button>
                        <button type="button" data-learning-action="export-dataset" class="secondary-btn">Export Training Dataset</button>
                        <button type="button" data-learning-action="close" class="secondary-btn">Cancel</button>
                    </div>
                </div>
                <div data-learning-summary style="margin-bottom:12px; color:#334155;"></div>
                <div data-learning-list style="display:flex; flex-direction:column; gap:12px;"></div>
                <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
                    <button type="button" data-learning-action="save" class="panel-btn">Save Learning Sample</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        return overlay;
    }

    function renderRow(item, index, isEditing) {
        const name = normalizeText(item.name);
        const weight = item.weight != null ? Number(item.weight) : '';
        const dueDate = normalizeText(item.dueDate || '');

        return `
            <div class="learning-item" data-index="${index}" style="border:1px solid #e2e8f0; border-radius:14px; padding:14px; background:#f8fafc;">
                <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start; flex-wrap:wrap;">
                    <div style="min-width:240px; flex:1;">
                        <div style="font-weight:800; font-size:1rem;">${name || 'Untitled assessment'}</div>
                        <div style="color:#64748b; font-size:0.9rem; margin-top:4px;">Weight: ${Number.isFinite(weight) ? `${weight}%` : 'Unknown'}${dueDate ? ` • Due: ${dueDate}` : ''}</div>
                        <div style="color:#94a3b8; font-size:0.8rem; margin-top:4px;">Confidence: ${(Number(item.confidence || 0) * 100).toFixed(0)}%</div>
                    </div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button type="button" data-review-action="correct" data-index="${index}" class="panel-btn">[Correct]</button>
                        <button type="button" data-review-action="edit" data-index="${index}" class="secondary-btn">[Edit]</button>
                        <button type="button" data-review-action="incorrect" data-index="${index}" class="secondary-btn">[Incorrect]</button>
                    </div>
                </div>
                <div data-edit-panel="${index}" style="display:${isEditing ? 'grid' : 'none'}; margin-top:12px; gap:10px; grid-template-columns:1fr 120px 160px;">
                    <input type="text" data-edit-name="${index}" value="${name.replace(/"/g, '&quot;')}" placeholder="Assessment name" style="width:100%;">
                    <input type="number" data-edit-weight="${index}" value="${Number.isFinite(weight) ? weight : ''}" placeholder="Weight" style="width:100%;">
                    <input type="text" data-edit-due="${index}" value="${dueDate.replace(/"/g, '&quot;')}" placeholder="Due date" style="width:100%;">
                    <div style="display:flex; gap:8px; grid-column:1 / -1; justify-content:flex-end;">
                        <button type="button" data-review-action="save-edit" data-index="${index}" class="panel-btn">Save Edit</button>
                        <button type="button" data-review-action="cancel-edit" data-index="${index}" class="secondary-btn">Cancel Edit</button>
                    </div>
                </div>
                <div data-status="${index}" style="margin-top:10px; font-size:0.85rem; color:#475569;">Pending review</div>
            </div>
        `;
    }

    function openReviewSession(payload) {
        const overlay = ensureOverlay();
        const list = overlay.querySelector('[data-learning-list]');
        const summary = overlay.querySelector('[data-learning-summary]');
        const extractedAssessments = Array.isArray(payload.extractedAssessments) ? payload.extractedAssessments : [];
        const state = extractedAssessments.map(item => ({
            extracted: {
                name: item.name || '',
                weight: item.weight != null ? Number(item.weight) : null,
                dueDate: item.dueDate || null
            },
            corrected: item.name ? {
                name: item.name || '',
                weight: item.weight != null ? Number(item.weight) : null,
                dueDate: item.dueDate || null
            } : null,
            status: 'pending',
            original: item
        }));

        console.log(
            'PREVIEW RECEIVED:',
            extractedAssessments
        );

        summary.textContent = `${payload.courseCode || 'Unknown course'} • ${state.length} assessment(s) extracted`;
        list.innerHTML = state.map((item, index) => renderRow(item.extracted, index)).join('');
        overlay.style.display = 'flex';

        function setStatus(index, status, message) {
            state[index].status = status;
            const node = overlay.querySelector(`[data-status="${index}"]`);
            if (node) node.textContent = message;
        }

        function applyEdit(index) {
            const nameInput = overlay.querySelector(`[data-edit-name="${index}"]`);
            const weightInput = overlay.querySelector(`[data-edit-weight="${index}"]`);
            const dueInput = overlay.querySelector(`[data-edit-due="${index}"]`);
            const corrected = {
                name: normalizeText(nameInput && nameInput.value),
                weight: weightInput && weightInput.value !== '' ? Number(weightInput.value) : null,
                dueDate: normalizeText(dueInput && dueInput.value) || null
            };

            state[index].corrected = corrected;
            state[index].status = 'edited';
            const rowTitle = overlay.querySelector(`[data-index="${index}"] [style*="font-weight:800"]`);
            if (rowTitle) rowTitle.textContent = corrected.name || 'Untitled assessment';
            setStatus(index, 'edited', 'Edited');
        }

        function refreshList() {
            list.innerHTML = state.map((item, index) => renderRow(item.corrected || item.extracted, index, item.status === 'editing')).join('');
            state.forEach((item, index) => {
                const statusNode = overlay.querySelector(`[data-status="${index}"]`);
                if (statusNode) {
                    if (item.status === 'correct') statusNode.textContent = 'Marked correct';
                    else if (item.status === 'edited') statusNode.textContent = 'Edited';
                    else if (item.status === 'editing') statusNode.textContent = 'Editing';
                    else if (item.status === 'incorrect') statusNode.textContent = 'Marked incorrect';
                    else statusNode.textContent = 'Pending review';
                }
            });
        }

        function handleAction(action, index) {
            if (action === 'correct') {
                state[index].corrected = state[index].corrected || state[index].extracted;
                setStatus(index, 'correct', 'Marked correct');
                return;
            }

            if (action === 'incorrect') {
                state[index].corrected = null;
                setStatus(index, 'incorrect', 'Marked incorrect');
                return;
            }

            if (action === 'edit') {
                setStatus(index, 'editing', 'Editing');
                return;
            }

            if (action === 'save-edit') {
                applyEdit(index);
                const panel = overlay.querySelector(`[data-edit-panel="${index}"]`);
                if (panel) panel.style.display = 'none';
                refreshList();
                return;
            }

            if (action === 'cancel-edit') {
                const panel = overlay.querySelector(`[data-edit-panel="${index}"]`);
                if (panel) panel.style.display = 'none';
                setStatus(index, state[index].status === 'edited' ? 'edited' : 'pending', state[index].status === 'edited' ? 'Edited' : 'Pending review');
                refreshList();
            }
        }

        function buildResult() {
            const corrections = state.map(item => ({
                extracted: item.extracted,
                corrected: item.corrected
            }));

            const correctedAssessments = state
                .map(item => item.corrected)
                .filter(Boolean);

            return {
                syllabusHash: payload.syllabusHash,
                courseCode: payload.courseCode,
                rawText: payload.rawText,
                extractedAssessments: state.map(item => item.extracted),
                correctedAssessments,
                corrections,
                extractedAssessment: state.length === 1 ? state[0].extracted : null,
                features: Array.isArray(payload.features) ? payload.features : [],
                timestamp: new Date().toISOString()
            };
        }

        return new Promise(resolve => {
            function close(result) {
                overlay.style.display = 'none';
                document.removeEventListener('click', clickHandler, true);
                resolve(result);
            }

            function clickHandler(event) {
                const actionButton = event.target.closest('[data-learning-action], [data-review-action]');
                if (!actionButton || !overlay.contains(actionButton)) return;

                event.preventDefault();
                event.stopPropagation();

                const action = actionButton.getAttribute('data-learning-action') || actionButton.getAttribute('data-review-action');
                const index = Number(actionButton.getAttribute('data-index'));

                if (action === 'close') {
                    close(null);
                    return;
                }

                if (action === 'run-regression') {
                    const result = namespace.regressionRunner.runAll();
                    showToast(result.passed ? 'Regression suite passed.' : `Regression suite failed: ${result.failed.length} case(s).`, result.passed ? 'success' : 'error');
                    return;
                }

                if (action === 'export-dataset') {
                    const data = namespace.trainingDataset.exportFutureDataset();
                    const blob = new Blob([data], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const anchor = document.createElement('a');
                    anchor.href = url;
                    anchor.download = 'pdfImportLearningTest_training_dataset.json';
                    anchor.click();
                    URL.revokeObjectURL(url);
                    return;
                }

                if (!Number.isNaN(index) && actionButton.hasAttribute('data-review-action')) {
                    handleAction(action, index);
                    refreshList();
                }

                if (action === 'save') {
                    close(buildResult());
                }
            }

            document.addEventListener('click', clickHandler, true);
            refreshList();
        });
    }

    namespace.ui = {
        openReviewSession
    };
})(window.PDFImportLearningTest);