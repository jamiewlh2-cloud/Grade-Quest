// pdfImport/parsers/dateParser.js

window.DateParser = {

    parse(text) {

        const dates = [];

        const dateRegex =
            /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,\s*\d{4})?\b/gi;

        const positiveSignals = [
            'assignment',
            'quiz',
            'lab',
            'project',
            'midterm',
            'final',
            'exam',
            'test',
            'due',
            'deadline',
            'submission'
        ];

        const negativeSignals = [
            'policy',
            'effective',
            'academic integrity',
            'requests for relief',
            'accommodation',
            'copyright',
            'conduct expectations',
            'communication policy',
            'religious',
            'indigenous',
            'spiritual observances',
            'updated'
        ];

        let match;

        while ((match = dateRegex.exec(text))) {

            const dateText = match[0];

            const start =
                Math.max(0, match.index - 150);

            const end =
                Math.min(
                    text.length,
                    match.index + 150
                );

            const context =
                text
                    .slice(start, end)
                    .toLowerCase();

            const hasPositiveSignal =
                positiveSignals.some(
                    signal =>
                        context.includes(signal)
                );

            const hasNegativeSignal =
                negativeSignals.some(
                    signal =>
                        context.includes(signal)
                );

            if (!hasPositiveSignal) {
                continue;
            }

            if (hasNegativeSignal) {
                continue;
            }

            dates.push({
                value: dateText,
                confidence: 'high'
            });

        }

        return dates;

    }

};