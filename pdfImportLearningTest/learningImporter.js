// pdfImportLearningTest/learningImporter.js

window.PDFImportLearningTest = window.PDFImportLearningTest || {};

(function (namespace) {
    function normalizeText(text) {
        return String(text || '').replace(/\s+/g, ' ').trim();
    }

    function normalizeAssessment(assessment) {
        return {
            name: normalizeText(assessment && assessment.name),
            weight: assessment && assessment.weight != null ? Number(assessment.weight) : null,
            dueDate: normalizeText(assessment && assessment.dueDate) || null
        };
    }

    function mapCorrections(extractedAssessments, approvedAssessments) {
        const extracted = (Array.isArray(extractedAssessments) ? extractedAssessments : [])
            .map(normalizeAssessment);
        const approved = (Array.isArray(approvedAssessments) ? approvedAssessments : [])
            .map(normalizeAssessment);
        const usedApprovedIndexes = new Set();

        function findApprovedMatch(extractedAssessment, extractedIndex) {
            const key = normalizeText(extractedAssessment && extractedAssessment.name).toLowerCase();
            if (!key) {
                return null;
            }

            const sameNameIndex = approved.findIndex((candidate, candidateIndex) => {
                if (usedApprovedIndexes.has(candidateIndex)) return false;
                return normalizeText(candidate && candidate.name).toLowerCase() === key;
            });

            if (sameNameIndex !== -1) {
                usedApprovedIndexes.add(sameNameIndex);
                return approved[sameNameIndex];
            }

            if (!usedApprovedIndexes.has(extractedIndex) && approved[extractedIndex]) {
                usedApprovedIndexes.add(extractedIndex);
                return approved[extractedIndex];
            }

            return null;
        }

        const corrections = extracted.map((item, index) => ({
            extracted: item,
            corrected: findApprovedMatch(item, index)
        }));

        const extractedKeys = new Set(extracted.map(item => normalizeText(item && item.name).toLowerCase()).filter(Boolean));
        approved.forEach(item => {
            const key = normalizeText(item && item.name).toLowerCase();
            if (!key || extractedKeys.has(key)) return;
            corrections.push({
                extracted: { name: '', weight: null, dueDate: null },
                corrected: item
            });
        });

        return corrections;
    }

    namespace.learningImporter = {
        async import(file) {
            console.log('TRAINING IMPORT START');

            const sharedPipeline = window.PDFImportSharedPipeline;
            if (!sharedPipeline) {
                throw new Error('Shared PDF import pipeline is unavailable.');
            }

            const document = await sharedPipeline.extractImportDocument(file);
            const course = CourseParser.parse(document.text || '');

            const pipeline = await sharedPipeline.runHybridAssessmentPipeline(document.text || '');
            const extractedAssessments = Array.isArray(pipeline.previewAssessments)
                ? pipeline.previewAssessments
                : [];

            console.log('AI ELIGIBLE:', pipeline.shouldUseAi);
            if (pipeline.shouldUseAi) {
                console.log('CALLING OLLAMA');
                if (pipeline.aiResult) {
                    console.log('AI RESPONSE RECEIVED');
                }
            }
            console.log('AI MERGE COMPLETE');

            console.log(
                'LEARNING IMPORTER COUNT:',
                extractedAssessments.length
            );

            console.log(
                'LEARNING IMPORTER DATA:',
                extractedAssessments
            );
            
            const features = namespace.assessmentExtractor.captureFeatures(document, extractedAssessments);

            const reviewData = {
                document,
                course,
                assessments: extractedAssessments,
                parserResult: {
                    assessments: pipeline.parserAssessments,
                    totalWeight: pipeline.parserConfidence.totalWeight,
                    confidence: pipeline.parserConfidence,
                    source: 'AssignmentParser'
                },
                aiResult: pipeline.aiResult ? {
                    ...pipeline.aiResult,
                    assessments: pipeline.aiAssessments,
                    source: 'ollama'
                } : null,
                parserConfidence: pipeline.parserConfidence,
                previewSource: pipeline.aiAssessments.length ? 'ollama' : 'parser',
                diagnostics: {
                    warnings: [...(pipeline.diagnostics.warnings || [])],
                    info: [...(pipeline.diagnostics.info || [])],
                    aiTotalWeight: pipeline.diagnostics.aiTotalWeight
                }
            };

            const previewResult = await PreviewModal.show(reviewData, {
                modeLabel: 'Training Mode'
            });

            if (!previewResult) return null;

            const approvedAssessments = Array.isArray(previewResult.finalApprovedResult && previewResult.finalApprovedResult.assessments)
                ? previewResult.finalApprovedResult.assessments
                : Array.isArray(previewResult.assessments)
                    ? previewResult.assessments
                    : [];

            const corrections = mapCorrections(extractedAssessments, approvedAssessments);

            const reviewResult = {
                syllabusHash: namespace.trainingDataset.getSyllabusHash(document.text || '', course.courseCode || ''),
                courseCode: course.courseCode || 'GENERAL',
                rawText: document.text || '',
                extractedAssessments: extractedAssessments.map(normalizeAssessment),
                correctedAssessments: approvedAssessments.map(normalizeAssessment),
                corrections,
                extractedAssessment: extractedAssessments.length === 1 ? normalizeAssessment(extractedAssessments[0]) : null,
                features,
                timestamp: new Date().toISOString()
            };

            console.log('TRAINING APPROVED RESULT:', {
                courseCode: reviewResult.courseCode,
                finalApprovedResult: {
                    assessments: reviewResult.correctedAssessments,
                    totalWeight: reviewResult.correctedAssessments.reduce((sum, item) => sum + Number((item && item.weight) || 0), 0),
                    assessmentCount: reviewResult.correctedAssessments.length
                }
            });

            const record = namespace.trainingDataset.append(reviewResult);
            if (record) {
                console.log('TRAINING DATA SAVED:', record);
            }

            (reviewResult.corrections || []).forEach(correction => {
                if (!correction.corrected) {
                    namespace.learningEngine.recordRejection(correction.extracted);
                    return;
                }

                if (normalizeText(correction.extracted.name) === normalizeText(correction.corrected.name)) {
                    namespace.learningEngine.recordAcceptance(correction.extracted);
                } else {
                    namespace.learningEngine.recordCorrection(correction.extracted, correction.corrected);
                }
            });

            return record;
        }
    };

    window.LearningCourseOutlineImporter = namespace.learningImporter;
})(window.PDFImportLearningTest);