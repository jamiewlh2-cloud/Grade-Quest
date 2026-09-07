// pdfImport/ocrProcessor.js

window.OCRProcessor = {
    async run(file) {
        const buffer = await file.arrayBuffer();

        const pdf = await pdfjsLib.getDocument({
            data: buffer
        }).promise;

        let result = '';

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {

            const page = await pdf.getPage(pageNum);

            const viewport = page.getViewport({
                scale: 2
            });

            const canvas = document.createElement('canvas');

            const ctx = canvas.getContext('2d');

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({
                canvasContext: ctx,
                viewport
            }).promise;

            const ocr = await Tesseract.recognize(
                canvas,
                'eng'
            );

            result += '\n' + ocr.data.text;
        }

        return result;
    }
};