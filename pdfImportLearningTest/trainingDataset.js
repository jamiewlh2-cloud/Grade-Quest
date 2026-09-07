// pdfImportLearningTest/trainingDataset.js

window.PDFImportLearningTest = window.PDFImportLearningTest || {};

(function (namespace) {
    const STORAGE_KEY = 'pdfImportLearningTest.trainingDataset';
    const FUTURE_DATASET_KEY = 'pdfImportLearningTest.futureDataset';
    const MAX_RECORDS = 250;
    const MAX_RAW_TEXT_CHARS = 1000;

    function normalizeText(text) {
        return String(text || '').replace(/\s+/g, ' ').trim();
    }

    function fnv1aHash(text) {
        let hash = 2166136261;
        const input = String(text || '');

        for (let index = 0; index < input.length; index++) {
            hash ^= input.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }

        return (`0000000${(hash >>> 0).toString(16)}`).slice(-8);
    }

    function serializeSize(value) {
        try {
            return JSON.stringify(value).length;
        } catch (error) {
            return 0;
        }
    }

    function compactRawText(text) {
        return normalizeText(text).slice(0, MAX_RAW_TEXT_CHARS);
    }

    function normalizeApprovedResult(result) {
        const assessments = normalizeAssessments(
            result && Array.isArray(result.assessments)
                ? result.assessments
                : []
        );

        const totalWeight = assessments.reduce((sum, item) => sum + Number(item.weight || 0), 0);

        return {
            assessments,
            totalWeight,
            assessmentCount: assessments.length,
            source: result && result.source ? String(result.source) : 'approved',
            approvedAt: result && result.approvedAt ? result.approvedAt : new Date().toISOString()
        };
    }

    function buildTrainingExamplesFromRecord(record) {
        const approved = Array.isArray(record.finalApprovedResult && record.finalApprovedResult.assessments)
            ? record.finalApprovedResult.assessments
            : [];

        const sourceRef = {
            syllabusHash: record.syllabusHash,
            courseCode: record.courseCode
        };

        return approved.map(assessment => ({
            input: sourceRef,
            output: [normalizeAssessment(assessment)],
            courseCode: record.courseCode,
            timestamp: record.timestamp,
            syllabusHash: record.syllabusHash,
            assessmentName: normalizeText(assessment && assessment.name),
            totalWeight: Number(assessment && assessment.weight || 0)
        }));
    }

    function compactRecordForStorage(input) {
        const rawText = compactRawText(input && input.rawText);
        const courseCode = normalizeText(input && input.courseCode).toUpperCase();
        const syllabusHash = input && input.syllabusHash
            ? normalizeText(input.syllabusHash)
            : fnv1aHash(`${rawText}|${courseCode}`);

        const finalApprovedResult = normalizeApprovedResult(
            input && input.finalApprovedResult
                ? input.finalApprovedResult
                : {
                    assessments: Array.isArray(input && input.correctedAssessments)
                        ? input.correctedAssessments.filter(Boolean)
                        : Array.isArray(input && input.extractedAssessments)
                            ? input.extractedAssessments.filter(Boolean)
                            : []
                }
        );

        return {
            id: input && input.id ? String(input.id) : makeId(),
            syllabusHash,
            courseCode,
            rawText,
            finalApprovedResult,
            timestamp: input && input.timestamp ? input.timestamp : new Date().toISOString(),
            feedback: Array.isArray(input && input.feedback) ? input.feedback : [],
            correctionCount: Array.isArray(input && input.corrections)
                ? input.corrections.length
                : 0
        };
    }

    function getLargestFields(records) {
        const fieldTotals = {};
        const fieldsToMeasure = [
            'rawText',
            'finalApprovedResult',
            'feedback',
            'timestamp',
            'courseCode',
            'syllabusHash'
        ];

        (Array.isArray(records) ? records : []).forEach(record => {
            fieldsToMeasure.forEach(field => {
                fieldTotals[field] = (fieldTotals[field] || 0) + serializeSize(record && record[field]);
            });
        });

        return Object.entries(fieldTotals)
            .map(([field, size]) => ({ field, size }))
            .sort((left, right) => right.size - left.size);
    }

    function summarizeStorageSavings(records) {
        const compactRecords = (Array.isArray(records) ? records : []).map(compactRecordForStorage);
        const rawSize = serializeSize({ records });
        const compactSize = serializeSize({ records: compactRecords });

        return {
            rawSize,
            compactSize,
            estimatedStorageSavingsBytes: Math.max(0, rawSize - compactSize)
        };
    }

    function buildStoredState(records) {
        const compactRecords = (Array.isArray(records) ? records : []).map(compactRecordForStorage);
        return {
            records: compactRecords
        };
    }

    function pruneRecordsToLimit(records) {
        const normalized = Array.isArray(records) ? records.slice() : [];
        if (normalized.length <= MAX_RECORDS) {
            return normalized;
        }

        const pruned = normalized.slice(-MAX_RECORDS);
        console.warn('TRAINING DATASET PRUNED TO MAX RECORDS:', {
            maxRecords: MAX_RECORDS,
            removedRecords: normalized.length - pruned.length
        });
        return pruned;
    }

    function loadState() {
        try {
            const parsed = GradeQuestStorage.getJson(STORAGE_KEY, {});
            const records = Array.isArray(parsed.records) ? parsed.records.map(record => compactRecordForStorage(record)) : [];
            return {
                records,
                futureDataset: buildFutureDataset(records)
            };
        } catch (error) {
            return { records: [], futureDataset: [] };
        }
    }

    function saveState(state) {
        const records = pruneRecordsToLimit(Array.isArray(state.records) ? state.records : []);
        const compactState = buildStoredState(records);

        console.log('TOTAL DATASET SIZE BEFORE SAVE:', serializeSize(compactState), 'bytes');

        let attemptRecords = records.slice();
        while (attemptRecords.length) {
            try {
                GradeQuestStorage.setJson(STORAGE_KEY, buildStoredState(attemptRecords));
                return {
                    records: attemptRecords,
                    futureDataset: buildFutureDataset(attemptRecords)
                };
            } catch (error) {
                if (!error || error.name !== 'QuotaExceededError') {
                    throw error;
                }

                console.warn('TRAINING DATASET QUOTA EXCEEDED, PRUNING OLDEST RECORD', {
                    currentCount: attemptRecords.length,
                    currentSizeBytes: serializeSize(buildStoredState(attemptRecords))
                });

                attemptRecords = attemptRecords.slice(1);
            }
        }

        GradeQuestStorage.setJson(STORAGE_KEY, buildStoredState([]));
        console.warn('TRAINING DATASET SAVED AS EMPTY AFTER PRUNING');
        return { records: [], futureDataset: [] };
    }

    function normalizeAssessment(assessment) {
        return {
            name: normalizeText(assessment && assessment.name),
            weight: assessment && assessment.weight != null ? Number(assessment.weight) : null,
            dueDate: normalizeText(assessment && assessment.dueDate) || null
        };
    }

    function buildFutureDataset(records) {
        return (Array.isArray(records) ? records : []).flatMap(buildTrainingExamplesFromRecord);
    }

    function isLikelyAssessmentName(name) {
        const value = normalizeText(name);
        if (!value || value.length < 3) {
            return false;
        }

        const lower = value.toLowerCase();
        const bannedPatterns = [
            /\bsee\s+note\b/i,
            /\bnotes?\b/i,
            /\bsimple\s+syllabus\b/i,
            /\bcourse\s+evaluation\b/i,
            /\btotal\s+marks?\b/i,
            /\ba\s+minimum\s+of\b/i,
            /\bto\s+meet\s+this\b/i,
            /\bworth\s+up\s+to\b/i,
            /\bcomplete\s+at\s+least\b/i
        ];

        if (bannedPatterns.some(pattern => pattern.test(lower))) {
            return false;
        }

        if (/^\d+(?:\.\d+)?%?$/.test(lower)) {
            return false;
        }

        const words = lower.split(/\s+/).filter(Boolean);
        if (!words.length) {
            return false;
        }

        const fillerWords = new Set([
            'the', 'a', 'an', 'of', 'to', 'for', 'and', 'or', 'is', 'are', 'be',
            'this', 'that', 'these', 'those', 'with', 'without', 'minimum', 'meet',
            'worth', 'least', 'complete', 'note', 'notes', 'see', 'up'
        ]);

        const nonFillerWords = words.filter(word => !fillerWords.has(word));
        if (!nonFillerWords.length) {
            return false;
        }

        if (words.length >= 8 && nonFillerWords.length <= 2) {
            return false;
        }

        return true;
    }

    function validateApprovedAssessments(correctedAssessments) {
        const normalized = (Array.isArray(correctedAssessments) ? correctedAssessments : [])
            .map(normalizeAssessment)
            .filter(Boolean);

        const totalWeight = normalized.reduce((sum, item) => sum + Number(item.weight || 0), 0);
        const seen = new Set();
        const duplicates = [];

        normalized.forEach(item => {
            const key = normalizeText(item.name).toLowerCase();
            if (!key) return;
            if (seen.has(key)) {
                duplicates.push(item.name);
            }
            seen.add(key);
        });

        const suspicious = normalized
            .filter(item => !isLikelyAssessmentName(item.name))
            .map(item => item.name);

        const warnings = [];
        if (duplicates.length) warnings.push('duplicate names exist');
        if (totalWeight > 130) warnings.push('total weight > 130');
        if (totalWeight < 70) warnings.push('total weight < 70');
        if (suspicious.length) warnings.push('suspicious assessment names exist');

        return {
            warnings,
            totalWeight,
            duplicates,
            suspicious
        };
    }

    function getApprovedAssessments(record) {
        if (record && record.finalApprovedResult && Array.isArray(record.finalApprovedResult.assessments)) {
            return record.finalApprovedResult.assessments;
        }

        if (record && Array.isArray(record.correctedAssessments)) {
            return record.correctedAssessments.filter(Boolean);
        }

        if (record && Array.isArray(record.extractedAssessments)) {
            return record.extractedAssessments.filter(Boolean);
        }

        if (record && record.extractedAssessment) {
            return [record.extractedAssessment];
        }

        return [];
    }

    function createRecord(input) {
        const normalized = compactRecordForStorage(input || {});
        const trainingSize = serializeSize(normalized);
        const fieldBreakdown = Object.entries({
            rawText: normalized.rawText,
            finalApprovedResult: normalized.finalApprovedResult,
            courseCode: normalized.courseCode,
            syllabusHash: normalized.syllabusHash,
            timestamp: normalized.timestamp,
            feedback: normalized.feedback
        }).map(([field, value]) => ({ field, size: serializeSize(value) }));

        console.log('TRAINING RECORD SIZE:', {
            recordBytes: trainingSize,
            fields: fieldBreakdown.sort((left, right) => right.size - left.size)
        });

        return normalized;
    }

    function buildAssessmentExamples(record) {
        return buildTrainingExamplesFromRecord(record);
    }

    namespace.trainingDataset = {
        load() {
            return loadState();
        },

        getAll() {
            return loadState().records;
        },

        append(record) {
            const state = loadState();

            const approvedValidation = validateApprovedAssessments(getApprovedAssessments(record));
            if (approvedValidation.warnings.length) {
                console.warn('TRAINING DATASET VALIDATION WARNINGS:', approvedValidation.warnings, approvedValidation);
                console.warn('TRAINING DATASET WRITE SKIPPED');
                return null;
            }

            const normalized = createRecord(record);
            state.records.push(normalized);
            const savedState = saveState(state);
            console.log('TRAINING DATASET WRITE COMPLETE:', {
                syllabusHash: normalized.syllabusHash,
                courseCode: normalized.courseCode,
                count: getApprovedAssessments(normalized).length
            });
            return normalized;
        },

        updateFeedback(syllabusHash, feedback) {
            const state = loadState();
            const record = state.records.find(item => item.syllabusHash === syllabusHash);
            if (!record) return null;

            record.feedback = Array.isArray(feedback) ? feedback : [];
            saveState(state);
            return record;
        },

        setFutureDatasetState(futureDataset, recordsOverride) {
            const state = recordsOverride
                ? { records: recordsOverride }
                : loadState();

            const nextRecords = Array.isArray(state.records) ? state.records : [];
            saveState({ records: nextRecords });
            return buildFutureDataset(nextRecords);
        },

        exportFutureDataset() {
            return JSON.stringify(buildFutureDataset(loadState().records), null, 2);
        },

        exportDataset() {
            const records = loadState().records;
            const dataset = records.map(record => ({
                syllabusHash: record.syllabusHash,
                courseCode: record.courseCode,
                timestamp: record.timestamp,
                approvedAssessments: getApprovedAssessments(record),
                totalWeight: getApprovedAssessments(record).reduce((sum, item) => sum + Number(item.weight || 0), 0),
                rawText: record.rawText,
                rawTextLength: normalizeText(record.rawText).length
            }));

            return JSON.stringify({
                version: 1,
                exportedAt: new Date().toISOString(),
                records: dataset
            }, null, 2);
        },

        getStats() {
            const state = loadState();
            const records = state.records;
            const uniqueCourses = new Set();
            let totalWeightSum = 0;
            let approvedCount = 0;

            records.forEach(record => {
                if (record.courseCode) {
                    uniqueCourses.add(record.courseCode);
                }

                const approved = getApprovedAssessments(record);
                approved.forEach(assessment => {
                    totalWeightSum += Number(assessment.weight || 0);
                    approvedCount += 1;
                });
            });

            const largestFields = getLargestFields(records);
            const storageSavings = summarizeStorageSavings(records);

            return {
                totalRecords: records.length,
                uniqueCourses: uniqueCourses.size,
                averageWeight: approvedCount ? totalWeightSum / approvedCount : 0,
                records,
                currentDatasetSize: storageSavings.compactSize,
                largestFields,
                estimatedStorageSavings: storageSavings.estimatedStorageSavingsBytes
            };
        },

        getSyllabusHash(rawText, courseCode) {
            return fnv1aHash(`${normalizeText(rawText)}|${normalizeText(courseCode).toUpperCase()}`);
        }
    };

    namespace.__trainingDatasetInternal = {
        saveState,
        loadState,
        normalizeAssessment,
        normalizeText
    };
})(window.PDFImportLearningTest);