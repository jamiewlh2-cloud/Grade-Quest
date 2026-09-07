// pdfImportLearningTest/regressionRunner.js

window.PDFImportLearningTest = window.PDFImportLearningTest || {};

(function (namespace) {
    const BASELINE_KEY = 'pdfImportLearningTest.regressionBaseline';

    function loadBaseline() {
        try {
            return JSON.parse(localStorage.getItem(BASELINE_KEY) || '{}');
        } catch (error) {
            return {};
        }
    }

    function saveBaseline(state) {
        localStorage.setItem(BASELINE_KEY, JSON.stringify(state));
    }

    function runSample(sample) {
        const stableAssessments = Array.isArray(AssignmentParser.parse(sample.rawText || ''))
            ? AssignmentParser.parse(sample.rawText || '')
            : [];
        const evaluation = namespace.parserEvaluator.evaluateSample(sample, stableAssessments);
        const assessmentCount = stableAssessments.length;
        const expectedAssessmentCount = Number.isFinite(Number(sample.expectedAssessmentCount))
            ? Number(sample.expectedAssessmentCount)
            : null;
        const maxAssessmentCount = Number.isFinite(Number(sample.maxAssessmentCount))
            ? Number(sample.maxAssessmentCount)
            : 15;
        const maxTotalWeight = Number.isFinite(Number(sample.maxTotalWeight))
            ? Number(sample.maxTotalWeight)
            : 120;
        const key = sample.course || sample.syllabusHash || namespace.trainingDataset.getSyllabusHash(sample.rawText || '', sample.course || '');
        const baseline = loadBaseline();
        const previousConfidence = baseline[key] && Number.isFinite(Number(baseline[key].averageConfidence))
            ? Number(baseline[key].averageConfidence)
            : null;

        const confidenceDropped = previousConfidence !== null
            ? namespace.parserEvaluator.compareConfidence(previousConfidence, evaluation.averageConfidence) < 0
            : false;

        const countMismatch = expectedAssessmentCount !== null
            ? assessmentCount !== expectedAssessmentCount
            : false;

        const tooManyAssessments = assessmentCount > maxAssessmentCount;

        const tooMuchWeight = evaluation.totalWeight > maxTotalWeight;

        const failed = !evaluation.passed || confidenceDropped || countMismatch || tooManyAssessments || tooMuchWeight;
        const result = {
            course: sample.course || '',
            passed: !failed,
            evaluation,
            confidenceDropped,
            assessmentCount,
            expectedAssessmentCount,
            countMismatch,
            maxAssessmentCount,
            maxTotalWeight,
            tooManyAssessments,
            tooMuchWeight,
            stableAssessments
        };

        if (!failed) {
            baseline[key] = {
                averageConfidence: evaluation.averageConfidence,
                timestamp: new Date().toISOString()
            };
            saveBaseline(baseline);
        }

        return result;
    }

    function runAll() {
        const samples = (window.PDFImportLearningTestTrainingData && Array.isArray(window.PDFImportLearningTestTrainingData.samples))
            ? window.PDFImportLearningTestTrainingData.samples
            : [];

        const results = samples.map(runSample);
        const failed = results.filter(result => !result.passed);

        return {
            passed: failed.length === 0,
            results,
            failed
        };
    }

    namespace.regressionRunner = {
        runAll,
        runSample
    };
})(window.PDFImportLearningTest);