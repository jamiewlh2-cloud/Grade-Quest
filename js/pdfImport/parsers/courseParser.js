// pdfImport/parsers/courseParser.js

window.CourseParser = {

    parse(text) {

        const result = {
            courseCode: '',
            courseName: '',
            instructor: '',
            semester: '',
            year: '',
            confidence: 'low'
        };

        const codeMatch =
            text.match(/[A-Z]{3,12}\s*\d[A-Z0-9]{2,5}/);

        if (codeMatch) {
            result.courseCode = codeMatch[0];
            result.confidence = 'high';
        }

        const semesterMatch =
            text.match(/(Fall|Winter|Spring|Summer)\s+20\d\d/i);

        if (semesterMatch) {
            result.semester = semesterMatch[1];
            result.year =
                semesterMatch[0].match(/20\d\d/)[0];
        }

        return result;
    }

};