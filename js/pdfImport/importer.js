// pdfImport/importer.js

function normalizeText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
}

function normalizeAssessment(assessment) {
    if (!assessment) {
        return null;
    }

    const name = normalizeText(assessment.name);
    const weight = assessment.weight != null && assessment.weight !== ''
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
        /\bcomplete\s+at\s+least\b/i,
        /\bis\s+worth\b/i,
        /\bworth\b/i,
        /\bmust\s+complete\b/i,
        /\bmust\s+include\b/i,
        /\bwill\s+receive\b/i,
        /\bstudents?\s+who\b/i
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

    if (/[.?!]$/.test(value) && words.length > 4) {
        return false;
    }

    return true;
}

function buildMergeKey(name) {
    return normalizeText(name)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function validateApprovedAssessmentsForTraining(assessments) {
    const normalized = normalizeAssessments(assessments);
    const totalWeight = normalized.reduce((sum, item) => sum + Number(item.weight || 0), 0);

    const duplicates = new Set();
    const seen = new Set();
    normalized.forEach(item => {
        const key = buildMergeKey(item.name);
        if (!key) return;
        if (seen.has(key)) {
            duplicates.add(key);
        }
        seen.add(key);
    });

    const suspicious = normalized.filter(item => !isLikelyAssessmentName(item.name));

    const warnings = [];
    if (duplicates.size) warnings.push('duplicate names exist');
    if (totalWeight > 130) warnings.push('total weight > 130');
    if (totalWeight < 70) warnings.push('total weight < 70');
    if (suspicious.length) warnings.push('suspicious assessment names exist');

    return {
        warnings,
        totalWeight,
        duplicates: Array.from(duplicates),
        suspicious
    };
}

function sumWeight(items) {
    return normalizeAssessments(items).reduce((sum, assessment) => {
        return sum + Number(assessment.weight || 0);
    }, 0);
}

function calculateParserConfidence(assessments) {
    const count = Array.isArray(assessments) ? assessments.length : 0;
    const totalWeight = sumWeight(assessments);
    const countScore = Math.min(1, count / 5);
    const weightScore = totalWeight >= 90 && totalWeight <= 110
        ? 1
        : Math.max(0, 1 - (Math.abs(100 - totalWeight) / 100));

    return {
        assessmentCount: count,
        totalWeight,
        countThresholdMet: count >= 3,
        weightThresholdMet: totalWeight >= 90 && totalWeight <= 110,
        score: Number(((countScore + weightScore) / 2).toFixed(2))
    };
}

function stripCodeFences(text) {
    return String(text || '')
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '');
}

function extractBalancedJsonCandidate(text, openChar) {
    const closeChar = openChar === '[' ? ']' : '}';
    const input = String(text || '');
    let startIndex = -1;
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = 0; index < input.length; index++) {
        const character = input[index];

        if (startIndex === -1) {
            if (character === openChar) {
                startIndex = index;
                depth = 1;
            }
            continue;
        }

        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (character === '\\') {
                escaped = true;
            } else if (character === '"') {
                inString = false;
            }
            continue;
        }

        if (character === '"') {
            inString = true;
            continue;
        }

        if (character === openChar) {
            depth += 1;
            continue;
        }

        if (character === closeChar) {
            depth -= 1;
            if (depth === 0) {
                return input.slice(startIndex, index + 1);
            }
        }
    }

    return null;
}

function parseOllamaAssessments(rawText) {
    const cleaned = stripCodeFences(rawText);

    function asAssessmentList(parsed) {
        if (Array.isArray(parsed)) {
            return parsed;
        }

        if (
            parsed &&
            typeof parsed === 'object' &&
            parsed.name &&
            parsed.weight != null
        ) {
            return [parsed];
        }

        if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.assessments)) {
                return parsed.assessments;
            }

            if (Array.isArray(parsed.items)) {
                return parsed.items;
            }
        }

        return [];
    }

    try {
        const parsed = JSON.parse(cleaned);
        return asAssessmentList(parsed);
    } catch (error) {
        const arrayCandidate = extractBalancedJsonCandidate(cleaned, '[');
        if (arrayCandidate) {
            try {
                return asAssessmentList(JSON.parse(arrayCandidate));
            } catch (innerError) {
                // fall through
            }
        }

        const objectCandidate = extractBalancedJsonCandidate(cleaned, '{');
        if (objectCandidate) {
            try {
                return asAssessmentList(JSON.parse(objectCandidate));
            } catch (innerError) {
                return [];
            }
        }

        return [];
    }
}

function extractAssessmentSection(documentText) {
    const text = String(documentText || '');
    if (!text.trim()) {
        return '';
    }

    const lines = text.split(/\r?\n/);
    const lineOffsets = [];
    let runningOffset = 0;

    lines.forEach(line => {
        lineOffsets.push(runningOffset);
        runningOffset += line.length + 1;
    });

    function normalizeHeadingLine(line) {
        return normalizeText(line)
            .replace(/^\d+(?:\.\d+)*\s+/, '')
            .replace(/[:\-–—]+\s*$/, '')
            .trim();
    }

    function isTargetHeadingLine(line) {
        const normalized = normalizeHeadingLine(line);
        if (!normalized || normalized.length > 120) {
            return false;
        }

        return /^(course\s+evaluation\s+details|course\s+evaluation|grading|evaluation|assessment)$/i.test(normalized);
    }

    function isMajorHeadingLine(line) {
        const trimmed = normalizeText(line);
        if (!trimmed || trimmed.length > 160) {
            return false;
        }

        if (/[.?!]$/.test(trimmed)) {
            return false;
        }

        const normalized = normalizeHeadingLine(trimmed);
        if (!normalized) {
            return false;
        }

        if (/^(course\s+evaluation\s+details|course\s+evaluation|grading|evaluation|assessment)$/i.test(normalized)) {
            return true;
        }

        if (/^\d+(?:\.\d+)*\s+[A-Z][A-Za-z0-9 &/,:;()\-]{2,}$/.test(trimmed)) {
            return true;
        }

        if (/^[A-Z][A-Z0-9 &/,:;()\-]{4,}$/.test(trimmed)) {
            return true;
        }

        return /^[A-Z][A-Za-z0-9 &/,:;()\-]{3,}$/.test(normalized) && normalized.split(/\s+/).length <= 10;
    }

    let headingIndex = -1;
    for (let index = 0; index < lines.length; index++) {
        if (isTargetHeadingLine(lines[index])) {
            headingIndex = index;
            break;
        }
    }

    if (headingIndex !== -1) {
        const matchedHeading = normalizeHeadingLine(lines[headingIndex]);
        const matchedOffset = lineOffsets[headingIndex] || 0;

        console.log('MATCHED HEADING:', matchedHeading);
        console.log('MATCHED LINE NUMBER:', headingIndex + 1);
        console.log('MATCHED CHARACTER OFFSET:', matchedOffset);
        console.log(matchedHeading);

        let endIndex = lines.length;
        for (let index = headingIndex + 1; index < lines.length; index++) {
            if (isMajorHeadingLine(lines[index])) {
                endIndex = index;
                break;
            }
        }

        const startOffset = matchedOffset;
        const baseEndOffset = endIndex < lineOffsets.length ? lineOffsets[endIndex] : text.length;
        let section = text.slice(startOffset, baseEndOffset).trim();

        if (section.length < 5000) {
            const expandedEnd = Math.min(text.length, startOffset + 8000);
            section = text.slice(startOffset, expandedEnd).trim();
        } else if (section.length > 8000) {
            section = section.slice(0, 8000);
        }

        return section;
    }

    const fallbackHeadingIndex = lines.findIndex(line => isMajorHeadingLine(line));
    if (fallbackHeadingIndex >= 0) {
        const startOffset = lineOffsets[fallbackHeadingIndex] || 0;
        const endOffset = Math.min(text.length, startOffset + 6000);
        return text.slice(startOffset, endOffset).trim();
    }

    return text.slice(0, Math.min(6000, text.length)).trim();
}

function buildOllamaPrompt(parserAssessments, assessmentSection) {
    return [
        'You are an assessment extraction engine.',
        '',
        'Your task is to extract ONLY graded assessments from a university syllabus.',
        '',
        'Return ONLY valid JSON.',
        '',
        'Example:',
        '[',
        '  {',
        '    "name": "Term Test 1",',
        '    "weight": 30,',
        '    "dueDate": ""',
        '  },',
        '  {',
        '    "name": "Term Test 2",',
        '    "weight": 35,',
        '    "dueDate": ""',
        '  },',
        '  {',
        '    "name": "Final Exam",',
        '    "weight": 35,',
        '    "dueDate": ""',
        '  }',
        ']',
        '',
        'Rules:',
        '',
        '- Return JSON only.',
        '- Do not add explanations.',
        '- Do not summarize.',
        '- Do not describe the document.',
        '- Ignore:',
        '  - academic integrity',
        '  - plagiarism policies',
        '  - accommodation policies',
        '  - grading scales',
        '  - percentage ranges like 90-100',
        '  - bonus marks unless they are formal assessments',
        '- Extract only items that contribute to the final grade.',
        '- Combine repeated references to the same assessment.',
        '- Use numbers only for weights.',
        '',
        'Before returning JSON:',
        '1. Identify ALL assessments.',
        '2. Calculate total assessment weight.',
        '3. If total weight is significantly below 100, continue searching the document.',
        '4. Return a complete assessment list.',
        '5. Do not stop after finding the first assessment.',
        '',
        'The assessment weights should usually total approximately 100%.',
        'If multiple assessments exist, return all of them.',
        '',
        'After extracting assessments, verify:',
        '- Did you find all assessment categories?',
        '- Are there additional rows in any grading table?',
        '- Does total weight appear close to 100?',
        'Only then return JSON.',
        '',
        'Parser output:',
        JSON.stringify(parserAssessments),
        '',
        'Syllabus grading section:',
        assessmentSection
    ].join('\n');
}

async function fetchOllamaAssessments(documentText, parserAssessments) {
    const section = extractAssessmentSection(documentText);

    console.log('ASSESSMENT SECTION:', section);
    console.log('ASSESSMENT SECTION LENGTH:', section.length);
    console.log('ASSESSMENT SECTION PREVIEW:', section.slice(0, 1500));

    const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'qwen3-coder:latest',
            prompt: buildOllamaPrompt(parserAssessments, section),
            stream: false,
            format: 'json'
        })
    });

    if (!response.ok) {
        throw new Error(`Ollama request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const output = typeof payload.response === 'string'
        ? payload.response
        : typeof payload.message === 'string'
            ? payload.message
            : '';

    console.log('OLLAMA RESPONSE:', output);

    const parsedAssessments = normalizeAssessments(parseOllamaAssessments(output));
    console.log('PARSED OLLAMA:', parsedAssessments);

    return {
        rawResponse: output,
        assessments: parsedAssessments
    };
}

async function extractImportDocument(file) {
    let document = await PDFReader.extractDocument(file);

    if (document && document.text && document.text.trim()) {
        return document;
    }

    const ocrText = await OCRProcessor.run(file);
    return PDFDocumentBuilder.fromText(ocrText);
}

async function runHybridAssessmentPipeline(documentText) {
    const parserAssessments = normalizeAssessments(AssignmentParser.parse(documentText || ''));
    const parserConfidence = calculateParserConfidence(parserAssessments);

    let aiResult = null;
    const shouldUseAi = !parserConfidence.weightThresholdMet || !parserConfidence.countThresholdMet;

    console.log('AI ELIGIBLE:', shouldUseAi);

    if (shouldUseAi) {
        try {
            console.log('CALLING OLLAMA');
            aiResult = await fetchOllamaAssessments(documentText || '', parserAssessments);
            console.log('AI RESPONSE RECEIVED');
        } catch (error) {
            console.warn('Ollama fallback failed:', error);
        }
    }

    const aiAssessments = Array.isArray(aiResult && aiResult.assessments)
        ? aiResult.assessments
        : [];

    const aiTotalWeight = aiAssessments.reduce(
        (sum, assessment) => sum + Number(assessment.weight || 0),
        0
    );

    const mergedAssessments = aiAssessments.length
        ? mergeAssessmentSources(parserAssessments, aiAssessments)
        : parserAssessments;

    const mergedTotalWeight = mergedAssessments.reduce(
        (sum, assessment) => sum + Number(assessment.weight || 0),
        0
    );

    console.log('AI TOTAL:', aiTotalWeight);
    console.log('MERGED ASSESSMENTS:', mergedAssessments);
    console.log('MERGED TOTAL:', mergedTotalWeight);
    console.log('AI MERGE COMPLETE');

    const previewAssessments = aiAssessments.length
        ? mergedAssessments
        : parserAssessments;

    const diagnostics = {
        warnings: [],
        info: [],
        aiTotalWeight
    };

    if (!parserAssessments.length) {
        diagnostics.warnings.push('No assessments were extracted.');
    }

    if (shouldUseAi && aiAssessments.length) {
        diagnostics.info.push('Ollama fallback supplied preview assessments.');
    }

    if (shouldUseAi && !aiAssessments.length) {
        diagnostics.warnings.push('Ollama fallback did not return any assessments.');
    }

    if (aiAssessments.length && aiTotalWeight < 70) {
        diagnostics.warnings.push('AI extraction appears incomplete.');
    }

    return {
        parserAssessments,
        parserConfidence,
        shouldUseAi,
        aiResult,
        aiAssessments,
        aiTotalWeight,
        mergedAssessments,
        mergedTotalWeight,
        previewAssessments,
        diagnostics
    };
}

window.PDFImportSharedPipeline = {
    extractImportDocument,
    runHybridAssessmentPipeline
};

function mergeAssessmentSources(parserAssessments, aiAssessments) {
    const parserList = normalizeAssessments(parserAssessments);
    const aiList = normalizeAssessments(aiAssessments);
    const filteredParserAssessments = parserList.filter(assessment => {
        const nameOk = isLikelyAssessmentName(assessment && assessment.name);
        const weight = Number(assessment && assessment.weight);
        const weightOk = Number.isFinite(weight) && weight > 0 && weight <= 100;
        return nameOk && weightOk;
    });

    const mergedAssessments = [];
    const indexByName = new Map();

    function getKey(assessment) {
        return buildMergeKey(assessment && assessment.name);
    }

    function upsert(assessment, source) {
        const key = getKey(assessment);
        if (!key) {
            return;
        }

        const normalizedAssessment = normalizeAssessment(assessment);
        if (!normalizedAssessment) {
            return;
        }

        const existingIndex = indexByName.get(key);

        if (existingIndex == null) {
            indexByName.set(key, mergedAssessments.length);
            mergedAssessments.push({ ...normalizedAssessment, _source: source });
            return;
        }

        const existing = mergedAssessments[existingIndex];
        const preferred = source === 'ai'
            ? {
                ...existing,
                ...normalizedAssessment,
                dueDate: normalizedAssessment.dueDate || existing.dueDate || ''
            }
            : {
                ...existing,
                dueDate: existing.dueDate || normalizedAssessment.dueDate || ''
            };

        mergedAssessments[existingIndex] = preferred;
    }

    console.log('PARSER INPUT:', parserAssessments);
    console.log('AI INPUT:', aiAssessments);
    console.log('FILTERED PARSER:', filteredParserAssessments);

    aiList.forEach(assessment => upsert(assessment, 'ai'));
    filteredParserAssessments.forEach(assessment => upsert(assessment, 'parser'));

    const merged = mergedAssessments.map(({ _source, ...assessment }) => assessment);
    console.log('FINAL MERGED:', merged);

    return merged;
}

window.CourseOutlineImporter = {
    async import(file) {

        const document = await extractImportDocument(file);

        console.log('TEXT LENGTH:', document.text.length);
        console.log(document.text.slice(8000, 14000));
        console.log(document.text.includes('Assessment'));
        console.log(document.text.includes('Evaluation'));
        console.log(document.text.includes('Grading'));
        console.log(document.text.includes('Client'));
        console.log(document.text.includes('Formation'));
        console.log(document.text.includes('Portfolio'));
        console.log('HAS CLIENT-SIDE TEST:', document.text.includes('Client-Side Test'));
        console.log('HAS PROJECT FINAL DELIVERABLE:', document.text.includes('Project Final Deliverable'));
        console.log('TEXT LENGTH:', document.text.length);
        console.log('HAS TEAM FORMATION:', document.text.includes('Team Formation'));
        console.log('HAS CLIENT-SIDE TEST:', document.text.includes('Client-Side Test'));
        console.log('HAS PROJECT FINAL DELIVERABLE:', document.text.includes('Project Final Deliverable'));
        console.log('HAS ASSESSMENT:', document.text.includes('Assessment'));
        console.log('HAS EVALUATION:', document.text.includes('Evaluation'));
        console.log('HAS GRADING:', document.text.includes('Grading'));
        console.log('HAS WEB PORTFOLIO:', document.text.includes('Web Portfolio'));
        console.log('HAS TEAM PROJECT:', document.text.includes('Team Project'));
        console.log('PERCENTAGES FOUND:', document.text.match(/\d+%/g));

        const webPortfolioIndex = document.text.indexOf('Web Portfolio');
        if (webPortfolioIndex !== -1) {
            console.log(
                document.text.slice(
                    Math.max(0, webPortfolioIndex - 1000),
                    webPortfolioIndex + 3000
                )
            );
        }

        const course = CourseParser.parse(document.text);
        const pipeline = await runHybridAssessmentPipeline(document.text || '');
        const parserAssessments = pipeline.parserAssessments;
        const parserConfidence = pipeline.parserConfidence;
        const shouldUseAi = pipeline.shouldUseAi;
        const aiResult = pipeline.aiResult;
        const aiAssessments = pipeline.aiAssessments;
        const previewAssessments = pipeline.previewAssessments;

        const weights = previewAssessments
            .filter(assessment => assessment.weight != null)
            .map(assessment => ({
                name: assessment.name,
                weight: assessment.weight
            }));

        const diagnostics = {
            warnings: [...(pipeline.diagnostics.warnings || [])],
            info: [...(pipeline.diagnostics.info || [])],
            aiTotalWeight: pipeline.diagnostics.aiTotalWeight
        };

        if (!document.sections.length) {
            diagnostics.warnings.push('Document sections could not be inferred.');
        }

        const data = {
            document,
            course,
            weights,
            assessments: previewAssessments,
            parserResult: {
                assessments: parserAssessments,
                totalWeight: parserConfidence.totalWeight,
                confidence: parserConfidence,
                source: 'AssignmentParser'
            },
            aiResult: aiResult ? {
                ...aiResult,
                assessments: aiAssessments,
                source: 'ollama'
            } : null,
            parserConfidence,
            previewSource: aiAssessments.length ? 'ollama' : 'parser',
            diagnostics
        };

        const errors = ImportValidator.validate(data);
        if (errors.length) {
            showToast(errors.join('\n'), 'error', 6000);
        }

        const reviewResult = await PreviewModal.show(data);
        if (!reviewResult) {
            return;
        }

        const finalApprovedResult = reviewResult.finalApprovedResult || {
            assessments: normalizeAssessments(reviewResult.assessments || data.assessments),
            totalWeight: sumWeight(reviewResult.assessments || data.assessments),
            assessmentCount: normalizeAssessments(reviewResult.assessments || data.assessments).length,
            source: reviewResult.source || data.previewSource,
            approvedAt: new Date().toISOString()
        };

        const finalAssessments = normalizeAssessments(finalApprovedResult.assessments || reviewResult.assessments || data.assessments);

        console.log('TRAINING APPROVED RESULT:', finalApprovedResult);

        const finalValidation = ImportValidator.validate({
            ...data,
            assessments: finalAssessments,
            diagnostics: {
                warnings: [],
                info: []
            }
        });

        if (finalValidation.length) {
            showToast(finalValidation.join('\n'), 'error', 6000);
            return;
        }

        const trainingValidation = validateApprovedAssessmentsForTraining(finalAssessments);
        if (trainingValidation.warnings.length) {
            console.warn('TRAINING VALIDATION WARNINGS:', trainingValidation.warnings, trainingValidation);
        }

        const record = {
            syllabusHash: window.PDFImportLearningTestTrainingData && typeof window.PDFImportLearningTestTrainingData.getSyllabusHash === 'function'
                ? window.PDFImportLearningTestTrainingData.getSyllabusHash(document.text || '', course.courseCode || '')
                : '',
            courseCode: course.courseCode || 'GENERAL',
            rawText: document.text || '',
            parserResult: {
                assessments: parserAssessments,
                totalWeight: parserConfidence.totalWeight,
                confidence: parserConfidence,
                source: 'AssignmentParser'
            },
            aiResult: aiResult ? {
                ...aiResult,
                assessments: aiAssessments,
                source: 'ollama'
            } : null,
            finalApprovedResult: {
                assessments: finalAssessments,
                totalWeight: sumWeight(finalAssessments),
                assessmentCount: finalAssessments.length,
                source: finalApprovedResult.source || data.previewSource,
                approvedAt: finalApprovedResult.approvedAt || new Date().toISOString()
            },
            model: shouldUseAi ? 'qwen3-coder:latest' : '',
            parserConfidence,
            previewSource: data.previewSource,
            timestamp: new Date().toISOString()
        };

        if (
            window.PDFImportLearningTestTrainingData &&
            typeof window.PDFImportLearningTestTrainingData.appendHybridRecord === 'function' &&
            trainingValidation.warnings.length === 0
        ) {
            window.PDFImportLearningTestTrainingData.appendHybridRecord(record);
            console.log('TRAINING DATA SAVED:', record);
        } else if (trainingValidation.warnings.length) {
            console.warn('TRAINING DATA SKIPPED DUE TO WARNINGS');
        }

        saveImportedCourse({
            ...data,
            assessments: finalAssessments,
            assignments: finalAssessments,
            finalApprovedResult,
            parserResult: data.parserResult,
            aiResult: data.aiResult
        });
    }
};