(function () {
    const offlineIndicator = document.getElementById('offlineIndicator');
    const installButton = document.getElementById('pwaInstallButton');
    let hasControlledClient = Boolean(navigator.serviceWorker && navigator.serviceWorker.controller);
    let connectionStateKnown = false;

    function updateConnectionStatus() {
        if (!offlineIndicator) return;
        const offline = connectionStateKnown && navigator.onLine === false;
        offlineIndicator.hidden = !offline;
        document.body.classList.toggle('is-offline', offline);
    }

    function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return;
        navigator.serviceWorker.register('./sw.js', { scope: './' }).then(registration => {
            const activateWaitingWorker = () => {
                if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            };
            registration.addEventListener('updatefound', () => {
                const installingWorker = registration.installing;
                if (!installingWorker) return;
                installingWorker.addEventListener('statechange', () => {
                    if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        activateWaitingWorker();
                    }
                });
            });
            return registration.update().catch(() => undefined).then(activateWaitingWorker);
        }).catch(error => console.warn('GradeQuest service worker registration failed:', error));

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!hasControlledClient) {
                hasControlledClient = true;
                return;
            }
            window.location.reload();
        });
    }

    window.addEventListener('online', () => {
        connectionStateKnown = true;
        updateConnectionStatus();
    });
    window.addEventListener('offline', () => {
        connectionStateKnown = true;
        updateConnectionStatus();
    });
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
    if (offlineIndicator) offlineIndicator.hidden = true;
    registerServiceWorker();
}());