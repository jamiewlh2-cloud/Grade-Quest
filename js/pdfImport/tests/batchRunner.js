// pdfImport/tests/batchRunner.js

window.BatchTester = {

    async run(pdfFiles) {

        const results = [];

        for (const file of pdfFiles) {

            try {

                const text =
                    await window.PDFReader.extractText(file);

                const assessments =
                    window.AssignmentParser.parse(text);

                const totalWeight =
                    assessments.reduce(
                        (sum, a) => sum + a.weight,
                        0
                    );

                const dateCount =
                    assessments.filter(
                        a => a.dueDate
                    ).length;

                results.push({
                    course:
                        file.name.replace('.pdf', ''),

                    assessments:
                        assessments.length,

                    totalWeight,

                    dates:
                        dateCount,

                    items:
                        assessments
                });

            } catch (err) {

                results.push({
                    course: file.name,
                    error: err.message
                });

            }

        }

        console.table(
            results.map(r => ({
                Course: r.course,
                Assessments: r.assessments,
                Weight: r.totalWeight,
                Dates: r.dates
            }))
        );

        return results;
    }
};