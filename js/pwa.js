(function () {
    const offlineIndicator = document.getElementById('offlineIndicator');
    const updatePrompt = document.getElementById('pwaUpdatePrompt');
    const updateButton = document.getElementById('pwaUpdateButton');
    const installButton = document.getElementById('pwaInstallButton');
    let waitingWorker = null;
    let hasControlledClient = Boolean(navigator.serviceWorker && navigator.serviceWorker.controller);

    function updateConnectionStatus() {
        if (!offlineIndicator) return;
        const offline = navigator.onLine === false;
        offlineIndicator.hidden = !offline;
        document.body.classList.toggle('is-offline', offline);
    }

    function showUpdatePrompt(worker) {
        waitingWorker = worker;
        if (updatePrompt) updatePrompt.hidden = false;
    }

    function hideUpdatePrompt() {
        waitingWorker = null;
        if (updatePrompt) updatePrompt.hidden = true;
    }

    function activateUpdate() {
        if (!waitingWorker) return;
        hideUpdatePrompt();
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }

    function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return;
        hideUpdatePrompt();
        navigator.serviceWorker.register('./sw.js', { scope: './' }).then(registration => {
            return registration.update().catch(() => undefined).then(() => {
                if (registration.waiting) showUpdatePrompt(registration.waiting);
            });
        }).catch(error => console.warn('GradeQuest service worker registration failed:', error));

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!hasControlledClient) {
                hasControlledClient = true;
                hideUpdatePrompt();
                return;
            }
            hideUpdatePrompt();
            window.location.reload();
        });
    }

    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    if (updateButton) updateButton.addEventListener('click', activateUpdate);
    window.addEventListener('appinstalled', () => {
        window.gradeQuestInstallEvent = null;
        document.body.classList.remove('can-install');
    });
    if (installButton) {
        installButton.addEventListener('click', async () => {
            if (!window.gradeQuestInstallEvent) return;
            window.gradeQuestInstallEvent.prompt();
            await window.gradeQuestInstallEvent.userChoice;
            window.gradeQuestInstallEvent = null;
            document.body.classList.remove('can-install');
        });
    }
    updateConnectionStatus();
    registerServiceWorker();
}());