// pdfImport/assessmentExtractor.js

function normalizeWhitespace(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
}

function compactText(text) {
    return normalizeWhitespace(text).toLowerCase();
}

function extractDateHint(text) {
    const month = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
    const day = '(?:0?[1-9]|[12][0-9]|3[01])';
    const year = '(?:,?\s*20\d{2})?';
    const regex = new RegExp(`\\b${month}\\.?\\s+${day}${year}\\b`, 'i');
    const match = normalizeWhitespace(text).match(regex);
    return match ? normalizeWhitespace(match[0]) : '';
}

function extractWeightHint(text) {
    const percentMatch = normalizeWhitespace(text).match(/(\d+(?:\.\d+)?)\s*%/);
    if (percentMatch) {
        return Number(percentMatch[1]);
    }

    const fractionMatch = normalizeWhitespace(text).match(/(\d+(?:\.\d+)?)\s*\/\s*100/);
    if (fractionMatch) {
        return Number(fractionMatch[1]);
    }

    return null;
}

function isSectionHeading(text) {
    const value = normalizeWhitespace(text);
    if (!value || value.length > 120) return false;

    const headingKeywords = [
        'assessment',
        'assessment breakdown',
        'grading',
        'evaluation',
        'weights',
        'marking',
        'schedule',
        'course outline',
        'course schedule',
        'important dates'
    ];

    if (headingKeywords.some(keyword => compactText(value).includes(keyword))) {
        return true;
    }

    return /^[A-Z][A-Z0-9 &:/,()\-]{4,}$/.test(value);
}

function splitParagraphs(document) {
    const paragraphs = Array.isArray(document && document.paragraphs)
        ? document.paragraphs
        : [];

    return paragraphs
        .map((paragraph, index) => ({
            index: typeof paragraph.index === 'number' ? paragraph.index : index,
            text: normalizeWhitespace(paragraph.text),
            pageNumber: paragraph.pageNumber || 0,
            lineIndex: paragraph.lineIndex ?? index
        }))
        .filter(paragraph => paragraph.text);
}

function groupParagraphsIntoSections(paragraphs) {
    const sections = [];
    let currentSection = null;

    paragraphs.forEach(paragraph => {
        if (isSectionHeading(paragraph.text)) {
            currentSection = {
                title: paragraph.text.replace(/:$/, ''),
                paragraphs: [paragraph],
                text: paragraph.text
            };
            sections.push(currentSection);
            return;
        }

        if (!currentSection) {
            currentSection = {
                title: 'Document',
                paragraphs: [],
                text: ''
            };
            sections.push(currentSection);
        }

        currentSection.paragraphs.push(paragraph);
        currentSection.text = currentSection.text
            ? `${currentSection.text}\n${paragraph.text}`
            : paragraph.text;
    });

    return sections;
}

function createCandidate(text, context = {}) {
    const trimmed = normalizeWhitespace(text);
    if (!trimmed) return null;

    const weight = context.weight != null ? Number(context.weight) : extractWeightHint(trimmed);
    const dueDate = context.dueDate || extractDateHint(trimmed) || '';
    const name = normalizeWhitespace(
        trimmed
            .replace(/\(?\s*\d+(?:\.\d+)?\s*%\s*\)?/g, '')
            .replace(/\b(?:due|on|by)\b.*$/i, '')
            .replace(/\b(?:weight|worth)\b.*$/i, '')
            .replace(/[:\-–—]+$/, '')
    );

    if (!name) return null;

    let confidence = 0.28;
    if (weight != null) confidence += 0.25;
    if (dueDate) confidence += 0.18;
    if (context.source === 'table') confidence += 0.12;
    if (context.source === 'schedule') confidence += 0.08;
    if (name.length > 4) confidence += 0.05;

    return {
        name,
        weight: weight == null || Number.isNaN(weight) ? null : weight,
        dueDate: dueDate || null,
        confidence: Math.min(0.99, Number(confidence.toFixed(2))),
        source: context.source || 'text',
        rawText: trimmed
    };
}

function extractFromSection(section, sectionIndex) {
    const text = normalizeWhitespace(section.text);
    const lower = compactText(text);
    const results = [];

    const tableRowPattern = /(?:^|\n)([^\n%]{4,120}?)(?:\s+|\s*[:\-–—]\s*)(\d+(?:\.\d+)?)\s*%/g;
    let rowMatch;

    while ((rowMatch = tableRowPattern.exec(section.text)) !== null) {
        const candidate = createCandidate(rowMatch[1], {
            weight: Number(rowMatch[2]),
            source: 'table'
            });
        if (candidate) {
            results.push(candidate);
            }
        }

    const schedulePattern = /(assignment|quiz|test|exam|project|presentation|reflection|report|discussion|lab|midterm|final|portfolio|journal|case study|participation)[^\n]{0,140}?((?:\d+(?:\.\d+)?)\s*%|due\s+[^\n]{0,60}?|on\s+[^\n]{0,60}?|by\s+[^\n]{0,60}?)/ig;
    let scheduleMatch;

    while ((scheduleMatch = schedulePattern.exec(text)) !== null) {
        const raw = normalizeWhitespace(scheduleMatch[0]);
        const type = normalizeWhitespace(scheduleMatch[1]);
        const weight = extractWeightHint(raw);
        const dueDate = extractDateHint(raw);
        const candidate = createCandidate(raw, {
            weight,
            dueDate,
            source: 'schedule'
            });

            if (candidate) {
            candidate.name = normalizeWhitespace(type.charAt(0).toUpperCase() + type.slice(1));
                results.push(candidate);
            }
    }

    if (lower.includes('assessment') || lower.includes('grading') || lower.includes('weight')) {
        section.paragraphs.forEach(paragraph => {
            const candidate = createCandidate(paragraph.text, {
                source: 'section'
            });
            if (candidate && candidate.weight != null) {
                results.push(candidate);
            }
        });
    }

    return results;
}

function dedupeAssessments(items) {
    const seen = new Set();
    const deduped = [];

    items.forEach(item => {
        if (!item || !item.name) return;

        const key = [
            item.name.toLowerCase(),
            item.weight == null ? '' : item.weight,
            item.dueDate || ''
        ].join('|');

        if (seen.has(key)) return;
        seen.add(key);
        deduped.push(item);
    });

    return deduped;
}

window.AssessmentExtractor = {
    extract(document) {
        const paragraphs = splitParagraphs(document);
        const sections = groupParagraphsIntoSections(paragraphs);
        const assessments = [];

        sections.forEach((section, sectionIndex) => {
            assessments.push(...extractFromSection(section, sectionIndex));
        });

        return dedupeAssessments(assessments);
    }
};