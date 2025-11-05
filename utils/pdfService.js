import PDFDocument from 'pdfkit';

/**
 * Helper function to format the date for the PDF.
 */
const formatPdfDate = (date, includeTime = false) => {
    if (!date) return 'N/A';
    try {
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'Asia/Kolkata'
        };
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        return new Date(date).toLocaleString('en-IN', options);
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

        const formattedEventDate = formatPdfDate(eventDate, true); // Include time for event date
        const issueDate = formatPdfDate(new Date());

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers).toString('base64');
            resolve(pdfData);
        });
        doc.on('error', reject);

        // --- Brand Colors ---
        const primaryColor = '#3B82F6'; // Alumni Network blue
        const accentColor = '#EBF4FF'; // Light blue for subtle backgrounds
        const textColor = '#333333';
        const mutedTextColor = '#666666';
        const successColor = '#28a745'; // Green for total amount

        // --- Header ---
        doc.rect(0, 0, doc.page.width, 80)
           .fill(primaryColor);

        // Placeholder for your logo (e.g., in white or a light color)
        // Make sure to replace 'YOUR_LOGO_PATH' with a real path to an image file
        // For example: doc.image('path/to/your/logo.png', 50, 20, { width: 150 });
        // If no image, you can just put text:
        doc.fontSize(24)
           .fillColor('#FFFFFF')
           .text('Alumni Network', 50, 30, { align: 'left' });

        doc.fontSize(10)
           .fillColor('#FFFFFF')
           .text('OFFICIAL PAYMENT RECEIPT', doc.page.width - 50, 35, { align: 'right' });
        doc.moveDown();

        // --- Main Content Area ---
        doc.fillColor(textColor)
           .font('Helvetica-Bold')
           .fontSize(28)
           .text('REGISTRATION CONFIRMED', 50, 120); // Starting below the header
        doc.moveDown(0.5);

        doc.font('Helvetica')
           .fontSize(12)
           .fillColor(mutedTextColor)
           .text(`Thank you for your payment, ${fullName}! Your registration is complete.`, 50, doc.y);
        doc.moveDown(2);

        // --- Receipt Details Section ---
        const startY = doc.y;
        doc.rect(50, startY - 10, doc.page.width - 100, 1) // Separator line
           .fill(accentColor);
        doc.moveDown(0.5);

        doc.fontSize(14).font('Helvetica-Bold').fillColor(textColor);
        doc.text('Payment Details:', 50, doc.y);
        doc.moveDown(0.5);

        doc.font('Helvetica').fontSize(12).fillColor(mutedTextColor);
        doc.text(`Transaction ID: `, 50, doc.y, { continued: true }).fillColor(textColor).text(paymentId || 'N/A', { align: 'right' });
        doc.fillColor(mutedTextColor).text(`Date Issued: `, 50, doc.y, { continued: true }).fillColor(textColor).text(issueDate, { align: 'right' });
        doc.fillColor(mutedTextColor).text(`Billed To: `, 50, doc.y, { continued: true }).fillColor(textColor).text(fullName, { align: 'right' });
        doc.fillColor(mutedTextColor).text(`Email: `, 50, doc.y, { continued: true }).fillColor(textColor).text(email, { align: 'right' });
        doc.moveDown(2);

        // --- Event Details Section (Like a Card) ---
        const cardX = 50;
        const cardY = doc.y;
        const cardWidth = doc.page.width - 100;
        const cardHeight = 100; // Adjust as needed

        doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 10)
           .fill(accentColor); // Light blue background for the card

        // Draw details inside the card
        const textIndent = 20; // Indent from the card edge
        doc.fillColor(textColor)
           .font('Helvetica-Bold')
           .fontSize(16)
           .text('Event Information', cardX + textIndent, cardY + 15);
        
        doc.font('Helvetica').fontSize(12).fillColor(mutedTextColor);
        doc.text(`Event Title: `, cardX + textIndent, cardY + 45, { continued: true })
           .fillColor(textColor).font('Helvetica-Bold').text(eventTitle || 'N/A', { align: 'right' });
        
        doc.fillColor(mutedTextColor).font('Helvetica').text(`Event Date: `, cardX + textIndent, cardY + 65, { continued: true })
           .fillColor(textColor).font('Helvetica-Bold').text(formattedEventDate, { align: 'right' });
        
        doc.moveDown(2); // Move below the card

        // --- Total Amount ---
        doc.rect(50, doc.y - 10, doc.page.width - 100, 1) // Separator line
           .fill(accentColor);
        doc.moveDown(1);

        doc.fontSize(20).font('Helvetica-Bold').fillColor(textColor);
        doc.text('Total Amount Paid', 50, doc.y, { continued: true });
        doc.fillColor(successColor).text(`₹${amount}`, 0, doc.y, { align: 'right' });
        doc.moveDown(3);

        // --- Footer ---
        doc.rect(0, doc.page.height - 60, doc.page.width, 60)
           .fill(primaryColor);
        doc.fontSize(10)
           .fillColor('#FFFFFF')
           .text('This is an auto-generated receipt. Thank you for being a part of the Alumni Network!', 
                 50, doc.page.height - 40, { align: 'center', width: doc.page.width - 100 });
        doc.text('Contact us: mcaigitalumni@gmail.com', 
                 50, doc.page.height - 25, { align: 'center', width: doc.page.width - 100 });

        // Finalize the PDF
        doc.end();
    });
};

// 🚀 --- NEW DONATION FUNCTION ADDED BELOW --- 🚀

/**
 * Generates a PDF donation receipt and returns it as a base64 string.
 * @param {object} details - The donation and donor details.
 */
export const generateDonationPDF = (details) => {
    return new Promise((resolve, reject) => {
        const {
            fullName,
            email,
            amount,
            paymentId
        } = details;

        const issueDate = formatPdfDate(new Date());

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers).toString('base64');
            resolve(pdfData);
        });
        doc.on('error', reject);

        // --- Brand Colors ---
        const primaryColor = '#3B82F6';
        const accentColor = '#EBF4FF';
        const textColor = '#333333';
        const mutedTextColor = '#666666';
        const successColor = '#28a745';

        // --- Header ---
        doc.rect(0, 0, doc.page.width, 80).fill(primaryColor);
        // Replace 'YOUR_LOGO_PATH' with a real file path or use text
        // doc.image('path/to/your/logo.png', 50, 20, { width: 150 }); 
        doc.fontSize(24).fillColor('#FFFFFF').text('Alumni Network', 50, 30, { align: 'left' });
        doc.fontSize(10).fillColor('#FFFFFF').text('OFFICIAL DONATION RECEIPT', doc.page.width - 50, 35, { align: 'right' });
        doc.moveDown();

        // --- Main Content Area ---
        doc.fillColor(textColor).font('Helvetica-Bold').fontSize(28).text('Thank You For Your Donation', 50, 120);
        doc.moveDown(0.5);
        doc.font('Helvetica').fontSize(12).fillColor(mutedTextColor).text(`Dear ${fullName}, we are deeply grateful for your support.`, 50, doc.y);
        doc.moveDown(2);

        // --- Receipt Details Section ---
        const startY = doc.y;
        doc.rect(50, startY - 10, doc.page.width - 100, 1).fill(accentColor);
        doc.moveDown(0.5);
        doc.fontSize(14).font('Helvetica-Bold').fillColor(textColor).text('Receipt Details:', 50, doc.y);
        doc.moveDown(0.5);

        doc.font('Helvetica').fontSize(12).fillColor(mutedTextColor);
        doc.text(`Transaction ID: `, 50, doc.y, { continued: true }).fillColor(textColor).text(paymentId || 'N/A', { align: 'right' });
        doc.fillColor(mutedTextColor).text(`Date Issued: `, 50, doc.y, { continued: true }).fillColor(textColor).text(issueDate, { align: 'right' });
        doc.fillColor(mutedTextColor).text(`Donor Name: `, 50, doc.y, { continued: true }).fillColor(textColor).text(fullName, { align: 'right' });
        doc.fillColor(mutedTextColor).text(`Donor Email: `, 50, doc.y, { continued: true }).fillColor(textColor).text(email, { align: 'right' });
        doc.moveDown(2);
        
        // --- Line Item Table ---
        doc.font('Helvetica-Bold').text('Description', 50, doc.y, { continued: true });
        doc.text('Amount', 0, doc.y, { align: 'right' });
        doc.rect(50, doc.y + 5, 510, 0.5).stroke();
        doc.moveDown(1);

        doc.font('Helvetica').text('Contribution to Alumni Network Fund', 50, doc.y, { width: 400 });
        doc.text(`₹${amount}`, 0, doc.y, { align: 'right' });
        doc.moveDown(2);
        
        doc.rect(50, doc.y + 5, 510, 0.5).stroke();
        doc.moveDown(1);

        // --- Total ---
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text('Total Donation', 50, doc.y, { continued: true });
        doc.fillColor(successColor).text(`₹${amount}`, 0, doc.y, { align: 'right' });
        doc.moveDown(3);

        // --- Footer ---
        doc.rect(0, doc.page.height - 60, doc.page.width, 60).fill(primaryColor);
        doc.fontSize(10).fillColor('#FFFFFF');
        doc.text('This is an auto-generated receipt. Thank you for your generous contribution!', 
                 50, doc.page.height - 40, { align: 'center', width: doc.page.width - 100 });
        doc.text('Contact us: mcaigitalumni@gmail.com', 
                 50, doc.page.height - 25, { align: 'center', width: doc.page.width - 100 });

        doc.end();
    });
};