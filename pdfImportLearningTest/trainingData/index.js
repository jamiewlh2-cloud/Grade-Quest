// pdfImportLearningTest/trainingData/index.js

window.PDFImportLearningTestTrainingData = window.PDFImportLearningTestTrainingData || {};

(function (namespace) {
    const HYBRID_STORAGE_KEY = 'pdfImportLearningTest.hybridTrainingRecords';

    function normalizeText(text) {
        return String(text || '').replace(/\s+/g, ' ').trim();
    }

    function makeId() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID();
        }

        return `hybrid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }

    function loadHybridState() {
        try {
            const parsed = JSON.parse(localStorage.getItem(HYBRID_STORAGE_KEY) || '{}');
            return {
                records: Array.isArray(parsed.records) ? parsed.records : []
            };
        } catch (error) {
            return {
                records: []
            };
        }
    }

    function saveHybridState(state) {
        localStorage.setItem(HYBRID_STORAGE_KEY, JSON.stringify({
            records: Array.isArray(state.records) ? state.records : []
        }));
    }

    function normalizeAssessment(assessment) {
        if (!assessment) return null;

        const name = normalizeText(assessment.name);
        const weight = assessment.weight !== '' && assessment.weight != null
            ? Number(assessment.weight)
            : null;
        const dueDate = normalizeText(assessment.dueDate);

        if (!name && weight == null && !dueDate) {
            return null;
        }

        return {
            name,
            weight: Number.isNaN(weight) ? null : weight,
            dueDate: dueDate || ''
        };
    }

    function normalizeAssessments(items) {
        return (Array.isArray(items) ? items : [])
            .map(normalizeAssessment)
            .filter(Boolean);
    }

    function normalizeSnapshot(snapshot) {
        if (!snapshot) {
            return null;
        }

        if (Array.isArray(snapshot)) {
            const assessments = normalizeAssessments(snapshot);
            return {
                assessments,
                totalWeight: assessments.reduce((sum, item) => sum + Number(item.weight || 0), 0),
                assessmentCount: assessments.length,
                source: 'array'
            };
        }

        const assessments = normalizeAssessments(
            snapshot.assessments || snapshot.items || []
        );

        const totalWeight = Number.isFinite(Number(snapshot.totalWeight))
            ? Number(snapshot.totalWeight)
            : assessments.reduce((sum, item) => sum + Number(item.weight || 0), 0);

        const assessmentCount = Number.isFinite(Number(snapshot.assessmentCount))
            ? Number(snapshot.assessmentCount)
            : assessments.length;

        return {
            ...snapshot,
            assessments,
            totalWeight,
            assessmentCount
        };
    }

    function normalizeRecord(record) {
        const parserResult = normalizeSnapshot(record && record.parserResult);
        const aiResult = normalizeSnapshot(record && record.aiResult);
        const finalApprovedResult = normalizeSnapshot(record && record.finalApprovedResult);

        const finalAssessments = normalizeAssessments(
            finalApprovedResult && Array.isArray(finalApprovedResult.assessments)
                ? finalApprovedResult.assessments
                : []
        );

        const finalTotalWeight = finalAssessments.reduce((sum, item) => {
            return sum + Number(item.weight || 0);
        }, 0);

        return {
            id: record && record.id ? String(record.id) : makeId(),
            syllabusHash: normalizeText(record && record.syllabusHash),
            courseCode: normalizeText(record && record.courseCode).toUpperCase(),
            rawText: String(record && record.rawText ? record.rawText : ''),
            parserResult,
            aiResult,
            finalApprovedResult,
            trainingAssessments: finalAssessments,
            trainingTotalWeight: finalTotalWeight,
            model: normalizeText(record && record.model),
            parserConfidence: record && record.parserConfidence ? record.parserConfidence : null,
            previewSource: normalizeText(record && record.previewSource),
            timestamp: record && record.timestamp ? record.timestamp : new Date().toISOString()
        };
    }

    function validateTrainingRecord(record) {
        const warnings = [];
        const finalAssessments = normalizeAssessments(
            record && record.finalApprovedResult && Array.isArray(record.finalApprovedResult.assessments)
                ? record.finalApprovedResult.assessments
                : []
        );

        const totalWeight = finalAssessments.reduce((sum, item) => sum + Number(item.weight || 0), 0);
        const duplicateNames = finalAssessments.reduce((counts, assessment) => {
            const key = normalizeText(assessment && assessment.name).toLowerCase();
            if (!key) return counts;
            counts[key] = (counts[key] || 0) + 1;
            return counts;
        }, {});

        if (totalWeight < 70) {
            warnings.push('totalWeight < 70');
        }

        if (totalWeight > 130) {
            warnings.push('totalWeight > 130');
        }

        if (Object.values(duplicateNames).some(count => count > 1)) {
            warnings.push('duplicate assessment names exist');
        }

        return {
            warnings,
            totalWeight,
            finalCount: finalAssessments.length
        };
    }

    function buildTrainingExample(record) {
        const finalAssessments = normalizeAssessments(
            record && record.finalApprovedResult && Array.isArray(record.finalApprovedResult.assessments)
                ? record.finalApprovedResult.assessments
                : []
        );

        return {
            id: record.id,
            syllabusHash: record.syllabusHash,
            courseCode: record.courseCode,
            rawText: record.rawText,
            assessments: finalAssessments,
            totalWeight: finalAssessments.reduce((sum, item) => sum + Number(item.weight || 0), 0),
            timestamp: record.timestamp
        };
    }

    function buildExportPayload(records) {
        return {
            version: 1,
            exportedAt: new Date().toISOString(),
            records: Array.isArray(records) ? records : []
        };
    }

    const samples = [
        {
            course: 'COMPSCI 1XD3',
            expectedAssessmentCount: 12,
            maxAssessmentCount: 15,
            maxTotalWeight: 120,
            rawText: [
                'Team Formation (1%)',
                'Initial Client Report Due (2%)',
                'Web Layout Assignment (10%)',
                'Client-Side Test (20%)',
                'JS Pair Assignment (5%)',
                'JS Individual Assignment (5%)',
                'Development Plan Due (5%)',
                'Server-Side Assignment (10%)',
                'Project Increment (15%)',
                'Server-Side Test (10%)',
                'Final Portfolio Review (7%)',
                'Project Final Deliverable (10%)'
            ].join('\n'),
            expectedAssessments: [
                { name: 'Team Formation', weight: 1 },
                { name: 'Initial Client Report', weight: 2 },
                { name: 'Web Layout Assignment', weight: 10 },
                { name: 'Client-Side Test', weight: 20 },
                { name: 'JS Pair Assignment', weight: 5 },
                { name: 'JS Individual Assignment', weight: 5 },
                { name: 'Development Plan', weight: 5 },
                { name: 'Server-Side Assignment', weight: 10 },
                { name: 'Project Increment', weight: 15 },
                { name: 'Server-Side Test', weight: 10 },
                { name: 'Final Portfolio Review', weight: 7 },
                { name: 'Project Final Deliverable', weight: 10 }
            ],
            expectedTotalWeight: 100
        }
    ];

    namespace.samples = samples;

    namespace.loadHybridRecords = function () {
        return loadHybridState().records.map(normalizeRecord);
    };

    namespace.getHybridRecords = function () {
        return namespace.loadHybridRecords();
    };

    namespace.getLatestHybridRecord = function () {
        const records = namespace.loadHybridRecords();
        return records.length ? records[records.length - 1] : null;
    };

    namespace.appendHybridRecord = function (record) {
        const state = loadHybridState();
        const normalized = normalizeRecord(record);
        const validation = validateTrainingRecord(normalized);

        if (validation.warnings.length) {
            console.warn('TRAINING RECORD VALIDATION WARNINGS:', validation.warnings);
        }

        console.log('TRAINING RECORD SAVED');
        console.log('COURSE CODE:', normalized.courseCode);
        console.log('PARSER COUNT:', Array.isArray(normalized.parserResult && normalized.parserResult.assessments) ? normalized.parserResult.assessments.length : 0);
        console.log('AI COUNT:', Array.isArray(normalized.aiResult && normalized.aiResult.assessments) ? normalized.aiResult.assessments.length : 0);
        console.log('FINAL COUNT:', Array.isArray(normalized.finalApprovedResult && normalized.finalApprovedResult.assessments) ? normalized.finalApprovedResult.assessments.length : 0);
        console.log('FINAL TOTAL WEIGHT:', normalized.trainingTotalWeight);

        state.records.push(normalized);
        saveHybridState(state);
        return normalized;
    };

    namespace.replaceHybridRecords = function (records) {
        const state = {
            records: (Array.isArray(records) ? records : []).map(normalizeRecord)
        };
        saveHybridState(state);
        return state.records;
    };

    namespace.clearHybridRecords = function () {
        saveHybridState({ records: [] });
        return [];
    };

    namespace.exportHybridRecords = function () {
        const payload = buildExportPayload(namespace.loadHybridRecords());
        return JSON.stringify(payload, null, 2);
    };

    namespace.exportDataset = function () {
        const records = namespace.loadHybridRecords();
        const dataset = records.map(buildTrainingExample);
        return JSON.stringify({
            version: 1,
            exportedAt: new Date().toISOString(),
            records: dataset
        }, null, 2);
    };

    namespace.getStats = function () {
        const records = namespace.loadHybridRecords();
        const uniqueCourses = new Set();
        let totalWeightSum = 0;
        let totalFinalAssessments = 0;

        records.forEach(record => {
            if (record.courseCode) {
                uniqueCourses.add(record.courseCode);
            }

            const assessments = Array.isArray(record.finalApprovedResult && record.finalApprovedResult.assessments)
                ? record.finalApprovedResult.assessments
                : [];

            assessments.forEach(assessment => {
                totalWeightSum += Number(assessment.weight || 0);
                totalFinalAssessments += 1;
            });
        });

        return {
            totalRecords: records.length,
            uniqueCourses: uniqueCourses.size,
            averageWeight: totalFinalAssessments ? totalWeightSum / totalFinalAssessments : 0,
            records
        };
    };

    namespace.downloadHybridRecords = function (filename) {
        const blob = new Blob([namespace.exportHybridRecords()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename || 'pdfImportLearningTest_hybridTrainingRecords.json';
        anchor.click();
        URL.revokeObjectURL(url);
    };

    namespace.importHybridRecords = function (jsonText) {
        const parsed = JSON.parse(String(jsonText || '{}'));
        const records = Array.isArray(parsed.records)
            ? parsed.records
            : Array.isArray(parsed)
                ? parsed
                : [];

        return namespace.replaceHybridRecords(records);
    };

    namespace.buildHybridRecord = function (input) {
        return normalizeRecord(input);
    };

    namespace.getSyllabusHash = function (rawText, courseCode) {
        const input = `${normalizeText(rawText)}|${normalizeText(courseCode).toUpperCase()}`;
        let hash = 2166136261;

        for (let index = 0; index < input.length; index++) {
            hash ^= input.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }

        return (`0000000${(hash >>> 0).toString(16)}`).slice(-8);
    };

    namespace.getTrainingDataExport = function () {
        return buildExportPayload(namespace.loadHybridRecords());
    };

    namespace.getTrainingDataSummary = function () {
        const records = namespace.loadHybridRecords();
        return {
            recordCount: records.length,
            latest: records.length ? records[records.length - 1] : null
        };
    };
})(window.PDFImportLearningTestTrainingData);