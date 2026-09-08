const CACHE_VERSION = 'gradequest-shell-v5';
const RUNTIME_CACHE = 'gradequest-runtime-v1';
const CDN_ASSETS = [
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
];
const APP_SHELL = [
    './', './index.html', './css/style.css', './firebase-config.js', './js/schools.js', './js/userStorage.js', './js/script.js',
    './js/productivity.js', './js/pdfImport/pdfReader.js', './js/pdfImport/ocrProcessor.js',
    './js/pdfImport/assessmentExtractor.js', './js/pdfImport/parsers/courseParser.js',
    './js/pdfImport/parsers/weightParser.js', './js/pdfImport/parsers/assignmentParser.js',
    './js/pdfImport/parsers/dateParser.js', './js/pdfImport/importer.js',
    './js/pdfImport/previewModal.js', './js/pdfImport/validator.js',
    './pdfImportLearningTest/trainingDataset.js', './pdfImportLearningTest/assessmentMemory.js',
    './pdfImportLearningTest/learningEngine.js', './pdfImportLearningTest/assessmentExtractor.js',
    './pdfImportLearningTest/trainingData/index.js', './pdfImportLearningTest/parserEvaluator.js',
    './pdfImportLearningTest/regressionRunner.js', './pdfImportLearningTest/ui/learningPreview.js',
    './pdfImportLearningTest/learningImporter.js', './js/pwa.js', './js/ui/feedback.js',
    './js/firebase/firebaseConfig.js', './js/firebase/firebaseClient.js', './js/firebase/authService.js',
    './js/firebase/authGate.js', './js/firebase/firestoreService.js', './js/firebase/userProfileService.js',
    './manifest.json',
    './icons/icon-192.svg', './icons/icon-512.svg'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys
                .filter(key => key.startsWith('gradequest-') && key !== CACHE_VERSION && key !== RUNTIME_CACHE)
                .map(key => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    const requestUrl = new URL(event.request.url);
    const isCdnAsset = CDN_ASSETS.includes(requestUrl.href);
    if (requestUrl.origin !== self.location.origin && !isCdnAsset) return;

    if (isCdnAsset) {
        event.respondWith(caches.open(RUNTIME_CACHE).then(cache => cache.match(event.request).then(cachedResponse => {
            const networkResponse = fetch(event.request, { mode: 'no-cors' })
                .then(response => {
                    if (!response) return response;
                    return cache.put(event.request, response.clone()).catch(() => undefined).then(() => response);
                })
                .catch(() => cachedResponse);
            return cachedResponse || networkResponse;
        })));
        return;
    }

    event.respondWith(caches.match(event.request).then(cachedResponse => {
        const networkResponse = fetch(event.request)
            .then(response => {
                if (response && response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_VERSION)
                        .then(cache => cache.put(event.request, responseClone))
                        .catch(() => undefined);
                }
                return response;
            })
            .catch(() => cachedResponse);
        return cachedResponse || networkResponse;
    }));
});