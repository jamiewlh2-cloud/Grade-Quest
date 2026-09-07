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
        window.setTimeout(() => toast.remove(), duration);
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
                    <button type="button" class="secondary-btn" data-dialog-cancel>${cancelLabel}</button>
                    <button type="button" class="${danger ? 'danger-btn' : 'panel-btn'}" data-dialog-confirm>${confirmLabel}</button>
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
    window.alert = message => showToast(String(message), 'info');
}());