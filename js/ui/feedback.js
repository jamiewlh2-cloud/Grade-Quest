(function () {
    let activeDialog = null;

    function showToast(message, type = 'info', duration = 3600) {
        const region = document.getElementById('toastRegion');
        if (!region) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
        toast.textContent = message;
        region.appendChild(toast);
        window.setTimeout(() => {
            toast.classList.add('is-leaving');
            window.setTimeout(() => toast.remove(), 180);
        }, Math.max(0, duration - 180));
    }

    function closeDialog(result) {
        if (!activeDialog) return;
        const dialog = activeDialog;
        activeDialog = null;
        dialog.element.remove();
        dialog.resolve(result);
    }

    function showDialog({ title, message, confirmLabel, cancelLabel = 'Cancel', inputValue = null, danger = false }) {
        if (activeDialog) closeDialog(null);
        const overlay = document.createElement('div');
        overlay.className = 'feedback-dialog-overlay';
        overlay.innerHTML = `
            <div class="feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="feedbackDialogTitle">
                <h2 id="feedbackDialogTitle">${title}</h2>
                <p>${message}</p>
                ${inputValue === null ? '' : '<input class="feedback-dialog-input" type="text" autocomplete="off">'}
                <div class="feedback-dialog-actions">
                    <button type="button" class="button-secondary" data-dialog-cancel>${cancelLabel}</button>
                    <button type="button" class="${danger ? 'button-destructive' : 'button-primary'}" data-dialog-confirm>${confirmLabel}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const input = overlay.querySelector('.feedback-dialog-input');
        if (input) {
            input.value = inputValue;
            input.type = title.toLowerCase().includes('password') ? 'password' : 'text';
        }
        const promise = new Promise(resolve => { activeDialog = { element: overlay, resolve }; });
        overlay.querySelector('[data-dialog-cancel]').addEventListener('click', () => closeDialog(null));
        overlay.querySelector('[data-dialog-confirm]').addEventListener('click', () => closeDialog(input ? input.value : true));
        overlay.addEventListener('click', event => { if (event.target === overlay) closeDialog(null); });
        overlay.addEventListener('keydown', event => { if (event.key === 'Escape') closeDialog(null); });
        (input || overlay.querySelector('[data-dialog-confirm]')).focus();
        return promise;
    }

    window.showToast = showToast;
    window.showConfirmDialog = options => showDialog({
        title: options.title || 'Are you sure?',
        message: options.message,
        confirmLabel: options.confirmLabel || 'Continue',
        danger: options.danger
    }).then(result => result === true);
    window.showTextDialog = options => showDialog({
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel || 'Use value',
        inputValue: options.value || ''
    });
    window.showFormDialog = ({ title, message, fields, confirmLabel = 'Save' }) => {
        if (activeDialog) closeDialog(null);
        const overlay = document.createElement('div');
        overlay.className = 'feedback-dialog-overlay';
        overlay.innerHTML = `
            <form class="feedback-dialog feedback-form-dialog" role="dialog" aria-modal="true" aria-labelledby="feedbackDialogTitle">
                <h2 id="feedbackDialogTitle">${title}</h2>
                <p>${message || ''}</p>
                <div class="feedback-form-fields">
                    ${fields.map(field => `
                        <label>${field.label}
                            ${field.type === 'textarea'
                                ? `<textarea name="${field.name}" rows="4">${field.value || ''}</textarea>`
                                : `<input name="${field.name}" type="${field.type || 'text'}" value="${field.value || ''}" ${field.min !== undefined ? `min="${field.min}"` : ''} ${field.max !== undefined ? `max="${field.max}"` : ''} ${field.step !== undefined ? `step="${field.step}"` : ''} required>`}
                        </label>
                    `).join('')}
                </div>
                <div class="feedback-dialog-actions">
                    <button type="button" class="button-secondary" data-dialog-cancel>Cancel</button>
                    <button type="submit" class="button-primary" data-dialog-confirm>${confirmLabel}</button>
                </div>
            </form>
        `;
        document.body.appendChild(overlay);
        const form = overlay.querySelector('form');
        const promise = new Promise(resolve => { activeDialog = { element: overlay, resolve }; });
        overlay.querySelector('[data-dialog-cancel]').addEventListener('click', () => closeDialog(null));
        form.addEventListener('submit', event => {
            event.preventDefault();
            closeDialog(Object.fromEntries(new FormData(form).entries()));
        });
        overlay.addEventListener('click', event => { if (event.target === overlay) closeDialog(null); });
        overlay.addEventListener('keydown', event => { if (event.key === 'Escape') closeDialog(null); });
        form.querySelector('input, textarea')?.focus();
        return promise;
    };
    window.alert = message => showToast(String(message), 'info');
}());