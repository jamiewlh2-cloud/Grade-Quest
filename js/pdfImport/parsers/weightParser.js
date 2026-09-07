// pdfImport/parsers/weightParser.js

window.WeightParser = {

    parse(text) {

        const results = [];
        const seen = new Set();

        const regex =
            /(assignments?\s*\(\d+\)|quizzes?\s*\(\d+\)|labs?\s*\(\d+\)|projects?\s*\(\d+\)|assignments?|quizzes?|labs?|projects?|midterm|final exam|exam)\s*(\d+)%/gi;

        let match;

        while ((match = regex.exec(text))) {

            const category =
                match[1].trim();

            const weight =
                Number(match[2]);

            const key =
                `${category.toLowerCase()}|${weight}`;

            if (seen.has(key)) {
                continue;
            }

            seen.add(key);

            results.push({
                category,
                weight,
                confidence: 'high'
            });

        }

        return results;
    }

};
