// pdfImportLearningTest/assessmentExtractor.js

window.PDFImportLearningTest = window.PDFImportLearningTest || {};

(function (namespace) {
    function normalizeText(text) {
        return String(text || '').replace(/\s+/g, ' ').trim();
    }

    function captureFeature(candidate, rawText, pageNumber, position) {
        const text = normalizeText(rawText);
        return {
            rawText: text,
            normalizedText: normalizeText(candidate && candidate.name ? candidate.name : '').toLowerCase(),
            surroundingContext: text,
            nearbyDate: candidate && candidate.dueDate ? candidate.dueDate : null,
            nearbyPercentage: candidate && candidate.weight != null ? Number(candidate.weight) : null,
            pageNumber: pageNumber || 0,
            position: position || 0
        };
    }

    function captureFeatures(document, extractedAssessments) {
        const paragraphs = Array.isArray(document && document.paragraphs) ? document.paragraphs : [];
        const assessments = Array.isArray(extractedAssessments) ? extractedAssessments : [];

        return assessments.map((assessment, index) => {
            const paragraph = paragraphs[Math.min(index, Math.max(0, paragraphs.length - 1))] || {};
            return captureFeature(assessment, paragraph.text || document && document.text || '', paragraph.pageNumber || 0, paragraph.lineIndex || index);
        });
    }

    namespace.assessmentExtractor = {
        captureFeatures,
        captureFeature
    };
})(window.PDFImportLearningTest);