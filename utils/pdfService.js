import PDFDocument from 'pdfkit';

/**
 * Helper function to format the date for the PDF.
 */
const formatPdfDate = (date) => {
    if (!date) return 'N/A';
    try {
        return new Date(date).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'Asia/Kolkata'
        });
    } catch (e) {
        return 'N/A';
    }
};

/**
 * Generates a PDF receipt and returns it as a base64 string.
 * @param {object} details - The registration and event details.
 */
export const generateReceiptPDF = (details) => {
    return new Promise((resolve, reject) => {
        const {
            fullName,
            email,
            eventTitle,
            amount,
            eventDate,
            paymentId
        } = details;

        const formattedDate = formatPdfDate(eventDate);
        const issueDate = formatPdfDate(new Date());

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers = [];

        // Register a callback for 'data' events
        doc.on('data', buffers.push.bind(buffers));
        // Register a callback for 'end' events
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers).toString('base64');
            resolve(pdfData);
        });
        doc.on('error', reject);

        // --- PDF Content ---

        // Header
        doc.fontSize(20).font('Helvetica-Bold').text('Payment Receipt', { align: 'center' });
        doc.fontSize(10).font('Helvetica').text('Alumni Network', { align: 'center' });
        doc.moveDown(2);

        // Receipt Info
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text(`Payment ID: `, { continued: true }).font('Helvetica').text(paymentId || 'N/A');
        doc.font('Helvetica-Bold').text(`Date Issued: `, { continued: true }).font('Helvetica').text(issueDate);
        doc.moveDown(1);

        // Bill To
        doc.font('Helvetica-Bold').text('Bill To:');
        doc.font('Helvetica').text(fullName);
        doc.text(email);
        doc.moveDown(2);

        // Line Item Table
        doc.font('Helvetica-Bold').text('Description', 50, doc.y, { continued: true });
        doc.text('Amount', 0, doc.y, { align: 'right' });
        doc.rect(50, doc.y + 5, 510, 0.5).stroke();
        doc.moveDown(1);

        // Row 1
        doc.font('Helvetica').text(`Registration for: ${eventTitle}`, 50, doc.y, { width: 400 });
        doc.text(`₹${amount}`, 0, doc.y, { align: 'right' });
        doc.text(`Event Date: ${formattedDate}`, 50, doc.y + 15, { width: 400 });
        doc.moveDown(2);
        
        doc.rect(50, doc.y + 5, 510, 0.5).stroke();
        doc.moveDown(1);

        // Total
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text('Total Paid', 50, doc.y, { continued: true });
        doc.text(`₹${amount}`, 0, doc.y, { align: 'right' });
        doc.moveDown(3);

        // Footer
        doc.fontSize(10).font('Helvetica-Oblique');
        doc.text('This is an auto-generated receipt. Thank you for your payment.', {
            align: 'center',
            width: 510
        });

        // Finalize the PDF
        doc.end();
    });
};