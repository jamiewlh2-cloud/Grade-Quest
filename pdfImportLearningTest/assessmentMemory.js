// pdfImportLearningTest/assessmentMemory.js

window.PDFImportLearningTest = window.PDFImportLearningTest || {};

(function (namespace) {
    const STORAGE_KEY = 'pdfImportLearningTest.assessmentMemory';

    function normalizePhrase(text) {
        return String(text || '')
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function tokenize(text) {
        return normalizePhrase(text).split(' ').filter(Boolean);
    }

    function loadState() {
        try {
            const parsed = GradeQuestStorage.getJson(STORAGE_KEY, {});
            return {
                corrections: Array.isArray(parsed.corrections) ? parsed.corrections : [],
                positivePatterns: Array.isArray(parsed.positivePatterns) ? parsed.positivePatterns : [],
                negativePatterns: Array.isArray(parsed.negativePatterns) ? parsed.negativePatterns : []
            };
        } catch (error) {
            return { corrections: [], positivePatterns: [], negativePatterns: [] };
        }
    }

    function saveState(state) {
        if (!GradeQuestStorage.getActiveUser()) return;
        GradeQuestStorage.setJson(STORAGE_KEY, state);
    }

    function similarityScore(left, right) {
        const leftTokens = new Set(tokenize(left));
        const rightTokens = new Set(tokenize(right));
        if (!leftTokens.size || !rightTokens.size) return 0;

        let overlap = 0;
        leftTokens.forEach(token => {
            if (rightTokens.has(token)) overlap += 1;
        });

        const union = new Set([...leftTokens, ...rightTokens]).size;
        return union ? overlap / union : 0;
    }

    function upsertPattern(state, collection, phrase, deltaKey) {
        const normalized = normalizePhrase(phrase);
        if (!normalized) return null;

        let entry = state[collection].find(item => item.normalizedPhrase === normalized);
        if (!entry) {
            entry = {
                phrase: String(phrase || '').trim(),
                normalizedPhrase: normalized,
                successfulImports: 0,
                rejectedImports: 0,
                confidence: 0,
                count: 0,
                correctedTitle: ''
            };
            state[collection].push(entry);
        }

        entry[deltaKey] += 1;
        entry.count += 1;
        entry.confidence = entry.successfulImports > entry.rejectedImports
            ? Math.min(1, entry.successfulImports / Math.max(1, entry.count))
            : Math.max(0, 1 - (entry.rejectedImports / Math.max(1, entry.count)));
        return entry;
    }

    namespace.assessmentMemory = {
        normalizePhrase,

        findSimilarCorrection(rawPhrase) {
            const state = loadState();
            const candidate = normalizePhrase(rawPhrase);
            let best = null;

            state.corrections.forEach(entry => {
                const similarity = Math.max(
                    similarityScore(candidate, entry.rawPhrase),
                    similarityScore(candidate, entry.correctedTitle)
                );

                if (similarity < 0.55) return;

                if (!best || similarity > best.similarity || (similarity === best.similarity && (entry.count || 0) > (best.entry.count || 0))) {
                    best = { entry, similarity };
                }
            });

            return best ? best.entry : null;
        },

        getPatternScore(phrase) {
            const state = loadState();
            const normalized = normalizePhrase(phrase);

            const positive = state.positivePatterns.reduce((sum, entry) => {
                const similarity = similarityScore(normalized, entry.normalizedPhrase);
                return similarity > 0.4 ? sum + entry.successfulImports : sum;
            }, 0);

            const negative = state.negativePatterns.reduce((sum, entry) => {
                const similarity = similarityScore(normalized, entry.normalizedPhrase);
                return similarity > 0.4 ? sum + entry.rejectedImports : sum;
            }, 0);

            return positive - negative;
        },

        recordSuccess(rawPhrase, correctedTitle) {
            const state = loadState();
            const normalizedRaw = normalizePhrase(rawPhrase);
            const normalizedCorrected = normalizePhrase(correctedTitle);
            if (!normalizedRaw || !normalizedCorrected) return null;

            let entry = state.corrections.find(item => item.normalizedRawPhrase === normalizedRaw);
            if (!entry) {
                entry = {
                    rawPhrase: String(rawPhrase || '').trim(),
                    normalizedRawPhrase: normalizedRaw,
                    correctedTitle: String(correctedTitle || '').trim(),
                    confidence: 1.0,
                    count: 0
                };
                state.corrections.push(entry);
            }

            entry.correctedTitle = String(correctedTitle || '').trim();
            entry.count += 1;
            entry.confidence = Math.min(1, 0.7 + (entry.count * 0.05));

            upsertPattern(state, 'positivePatterns', correctedTitle, 'successfulImports');
            saveState(state);
            return entry;
        },

        recordRejection(rawPhrase) {
            const state = loadState();
            const normalizedRaw = normalizePhrase(rawPhrase);
            if (!normalizedRaw) return null;

            upsertPattern(state, 'negativePatterns', rawPhrase, 'rejectedImports');

            const existing = state.negativePatterns.find(item => item.normalizedPhrase === normalizedRaw);
            if (!existing) {
                state.negativePatterns.push({
                    phrase: String(rawPhrase || '').trim(),
                    normalizedPhrase: normalizedRaw,
                    successfulImports: 0,
                    rejectedImports: 1,
                    confidence: 0,
                    count: 1
                });
            }

            saveState(state);
            return normalizedRaw;
        },

        recordPositivePattern(phrase) {
            const state = loadState();
            const entry = upsertPattern(state, 'positivePatterns', phrase, 'successfulImports');
            saveState(state);
            return entry;
        },

        recordNegativePattern(phrase) {
            const state = loadState();
            const entry = upsertPattern(state, 'negativePatterns', phrase, 'rejectedImports');
            saveState(state);
            return entry;
        }
    };
})(window.PDFImportLearningTest);