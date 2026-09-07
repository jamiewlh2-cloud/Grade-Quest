// pdfImportLearningTest/parserEvaluator.js

window.PDFImportLearningTest = window.PDFImportLearningTest || {};

(function (namespace) {
    function normalizeTitle(text) {
        return String(text || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    function toAssessmentMap(items) {
        const map = new Map();
        (items || []).forEach(item => {
            if (!item || !item.name) return;
            map.set(normalizeTitle(item.name), item);
        });
        return map;
    }

    function evaluateSample(sample, extracted) {
        const expected = Array.isArray(sample.expectedAssessments) ? sample.expectedAssessments : [];
        const expectedMap = toAssessmentMap(expected);
        const extractedMap = toAssessmentMap(extracted);

        const missing = [];
        expectedMap.forEach((value, key) => {
            if (!extractedMap.has(key)) missing.push(value.name);
        });

        const totalWeight = (extracted || []).reduce((sum, item) => sum + Number(item.weight || 0), 0);
        const totalWeightDelta = Math.abs(Number(sample.expectedTotalWeight || 0) - totalWeight);

        const confidenceValues = (extracted || []).map(item => Number(item.confidence || 0));
        const averageConfidence = confidenceValues.length ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length : 0;

        return {
            passed: missing.length === 0 && totalWeightDelta <= 2,
            missing,
            totalWeight,
            totalWeightDelta,
            averageConfidence
        };
    }

    function compareStableOutput(expected, extracted) {
        const result = evaluateSample(expected, extracted);
        return {
            ...result,
            stableOutput: extracted
        };
    }

    namespace.parserEvaluator = {
        evaluateSample,
        compareStableOutput,

        compareConfidence(previous, current) {
            return (Number(current || 0) - Number(previous || 0));
        }
    };
})(window.PDFImportLearningTest);