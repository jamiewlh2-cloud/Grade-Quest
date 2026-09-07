// pdfImportLearningTest/learningEngine.js

window.PDFImportLearningTest = window.PDFImportLearningTest || {};

(function (namespace) {
    const MEMORY = () => namespace.assessmentMemory;
    const DATASET = () => namespace.trainingDataset;

    function normalizeText(text) {
        return String(text || '').replace(/\s+/g, ' ').trim();
    }

    function extractAssessmentNounScore(text) {
        const nouns = [
            'assignment', 'quiz', 'lab', 'test', 'exam', 'midterm',
            'project', 'report', 'portfolio', 'presentation', 'participation',
            'tutorial', 'deliverable', 'formation', 'plan', 'reflection', 'review', 'increment'
        ];

        const normalized = normalizeText(text).toLowerCase();
        return nouns.some(noun => new RegExp(`\\b${noun}\\b`, 'i').test(normalized)) ? 1 : 0;
    }

    function scoreAssessmentCandidate(candidate) {
        const text = normalizeText(candidate.rawText || candidate.normalizedText || candidate.surroundingContext);
        const base = Number.isFinite(Number(candidate.confidence)) ? Number(candidate.confidence) : 0.35;
        const memoryMatch = MEMORY().findSimilarCorrection(text);
        const patternScore = MEMORY().getPatternScore(text);

        let score = base;
        if (memoryMatch) score += 0.3;
        score += Math.max(-0.25, Math.min(0.25, patternScore / 20));

        if ((candidate.weight == null) || Number.isNaN(Number(candidate.weight))) score -= 0.2;
        if (candidate.name && candidate.name.split(/\s+/).length > 8) score -= 0.2;
        if (candidate.nearbyPercentage != null) score += 0.1;
        if (candidate.nearbyDate) score += 0.05;
        if (!extractAssessmentNounScore(text)) score -= 0.35;

        const banned = [
            'lecture', 'topic', 'topics', 'chapter', 'week', 'course schedule', 'readings'
        ];
        if (banned.some(word => text.toLowerCase().includes(word))) score -= 0.3;

        return Math.max(0, Math.min(1, Number(score.toFixed(3))));
    }

    function suggestCorrection(candidate) {
        const text = normalizeText(candidate.rawText || candidate.normalizedText || candidate.surroundingContext);
        const match = MEMORY().findSimilarCorrection(text);
        if (!match) return null;

        return {
            name: match.correctedTitle,
            confidence: match.confidence,
            source: 'memory'
        };
    }

    function recordAcceptance(candidate) {
        const text = normalizeText(candidate.rawText || candidate.normalizedText || candidate.surroundingContext);
        if (!text) return null;

        MEMORY().recordPositivePattern(text);
        return suggestCorrection(candidate);
    }

    function recordRejection(candidate) {
        const text = normalizeText(candidate.rawText || candidate.normalizedText || candidate.surroundingContext);
        if (!text) return null;

        MEMORY().recordNegativePattern(text);
        return text;
    }

    function recordCorrection(candidate, corrected) {
        const extracted = {
            name: normalizeText(candidate.name),
            weight: candidate.weight != null ? Number(candidate.weight) : null,
            dueDate: normalizeText(candidate.dueDate) || null
        };

        const correctedAssessment = corrected
            ? {
                name: normalizeText(corrected.name),
                weight: corrected.weight != null ? Number(corrected.weight) : null,
                dueDate: normalizeText(corrected.dueDate) || null
            }
            : null;

        if (correctedAssessment && correctedAssessment.name) {
            MEMORY().recordSuccess(extracted.name || extracted.dueDate || candidate.rawText, correctedAssessment.name);
        } else {
            MEMORY().recordRejection(extracted.name || candidate.rawText);
        }

        return { extracted, corrected: correctedAssessment };
    }

    function updateCandidateConfidence(candidate) {
        const score = scoreAssessmentCandidate(candidate);
        return {
            ...candidate,
            confidence: score
        };
    }

    namespace.learningEngine = {
        scoreAssessmentCandidate,
        suggestCorrection,
        recordAcceptance,
        recordRejection,
        recordCorrection,
        updateCandidateConfidence,
        exportTrainingDataset() {
            return DATASET().trainingDataset.exportFutureDataset();
        }
    };
})(window.PDFImportLearningTest);