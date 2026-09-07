// pdfImport/pdfReader.js

function normalizeWhitespace(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
}

function buildLinesFromItems(items) {
    const sortedItems = items
        .filter(item => item && typeof item.str === 'string' && item.str.trim())
        .map(item => ({
            str: item.str,
            x: item.transform ? item.transform[4] : 0,
            y: item.transform ? item.transform[5] : 0
        }))
        .sort((a, b) => b.y - a.y || a.x - b.x);

    const lines = [];
    let currentLine = null;

    sortedItems.forEach(item => {
        if (!currentLine || Math.abs(currentLine.y - item.y) > 3) {
            currentLine = {
                y: item.y,
                items: [item]
            };
            lines.push(currentLine);
            return;
        }

        currentLine.items.push(item);
    });

    return lines.map((line, index) => ({
        index,
        text: normalizeWhitespace(
            line.items
                .sort((a, b) => a.x - b.x)
                .map(item => item.str)
                .join(' ')
        ),
        y: line.y
    })).filter(line => line.text);
}

function isHeadingLine(text) {
    const value = normalizeWhitespace(text);
    if (!value) return false;
    if (value.length > 90) return false;

    const headingSignals = [
        'assessment',
        'grading',
        'evaluation',
        'schedule',
        'weekly schedule',
        'course outline',
        'marking scheme',
        'breakdown',
        'requirements',
        'course policy'
    ];

    if (headingSignals.some(signal => value.toLowerCase().includes(signal))) {
        return true;
    }

    const letters = value.replace(/[^A-Za-z]/g, '');
    const uppercaseRatio = letters ? letters.replace(/[^A-Z]/g, '').length / letters.length : 0;

    return uppercaseRatio > 0.7 || /^[A-Z][A-Za-z0-9&'(),\-/ ]{1,80}:?$/.test(value);
}

function buildSections(paragraphs) {
    const sections = [];
    let currentSection = null;

    paragraphs.forEach(paragraph => {
        const text = normalizeWhitespace(paragraph.text);
        if (!text) return;

        if (isHeadingLine(text)) {
            currentSection = {
                title: text.replace(/:$/, ''),
                text: text,
                paragraphs: [paragraph.index],
                startIndex: paragraph.index,
                endIndex: paragraph.index
            };
            sections.push(currentSection);
            return;
        }

        if (!currentSection) {
            currentSection = {
                title: 'Document',
                text: '',
                paragraphs: [],
                startIndex: paragraph.index,
                endIndex: paragraph.index
            };
            sections.push(currentSection);
        }

        currentSection.text = currentSection.text
            ? `${currentSection.text}\n${text}`
            : text;
        currentSection.paragraphs.push(paragraph.index);
        currentSection.endIndex = paragraph.index;
    });

    return sections;
}

function buildDocumentStructure(text, pageLines = []) {
    const normalizedText = normalizeWhitespace(text).replace(/\s*\n\s*/g, '\n').trim();
    const paragraphSource = pageLines.length
        ? pageLines
        : normalizedText
            .split(/\n{2,}|\n/)
            .map((paragraphText, index) => ({
                index,
                text: normalizeWhitespace(paragraphText)
            }))
            .filter(paragraph => paragraph.text);

    const paragraphs = paragraphSource.map((paragraph, index) => ({
        index,
        text: normalizeWhitespace(paragraph.text),
        sourceText: normalizeWhitespace(paragraph.text),
        pageNumber: paragraph.pageNumber || 0,
        lineIndex: paragraph.lineIndex ?? index
    }));

    const sections = buildSections(paragraphs);

    return {
        text: paragraphs.map(paragraph => paragraph.text).join('\n\n'),
        sections,
        paragraphs
    };
}

window.PDFDocumentBuilder = {
    fromText(text) {
        return buildDocumentStructure(text);
    },
    fromLines(text, lines) {
        return buildDocumentStructure(text, lines);
    }
};

window.PDFReader = {
    async extractDocument(file) {
        const buffer = await file.arrayBuffer();

        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        const paragraphs = [];
        let fullText = '';

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const content = await page.getTextContent();
            const lines = buildLinesFromItems(content.items);

            lines.forEach(line => {
                paragraphs.push({
                    pageNumber: pageNum,
                    lineIndex: line.index,
                    text: line.text
                });
            });

            fullText += '\n' + lines.map(line => line.text).join('\n');
        }

        return buildDocumentStructure(fullText, paragraphs);
    },

    async extractText(file) {
        const document = await this.extractDocument(file);
        return document.text;
    }
};