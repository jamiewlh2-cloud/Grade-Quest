// pdfImport/validator.js

window.ImportValidator = {

    validate(data) {

        const errors = [];
        const warnings = [];
        const assessments = Array.isArray(data.assessments)
            ? data.assessments
            : Array.isArray(data.assignments)
                ? data.assignments
                : [];

        const total =
            assessments.reduce(
                (sum, item) =>
                    sum + Number(item.weight || 0),
                0
            );

        if (!assessments.length) {
            errors.push('No assessments were extracted from the syllabus.');
        }

        if (
            assessments.length &&
            Math.abs(total - 100) > 2
        ) {

            warnings.push(
                `Weights total ${total.toFixed(1)}% instead of 100%`
            );

        }

        if (total > 130) {
            warnings.push('Probable over-extraction detected.');
        }

        assessments.forEach((assessment, index) => {
            if (!String(assessment.name || '').trim()) {
                errors.push(`Assessment ${index + 1} is missing a name.`);
            }
            if (assessment.confidence != null && (assessment.confidence < 0 || assessment.confidence > 1)) {
                warnings.push(`Assessment ${assessment.name || index + 1} has an out-of-range confidence score.`);
            }
        });

        if (!data.diagnostics) {
            data.diagnostics = { warnings: [], info: [] };
        }

        data.diagnostics.warnings = (data.diagnostics.warnings || []).concat(warnings);

        return errors;

    }

};