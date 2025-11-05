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
    // This is your existing function for Event Receipts (Unchanged)
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
           
        // doc.image('path/to/your/logo.png', 50, 20, { width: 150 });
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

        const textIndent = 20;
        doc.fillColor(textColor)
           .font('Helvetica-Bold')
           .fontSize(16)
           .text('Event Information', cardX + textIndent, cardY + 15);
        
        doc.font('Helvetica').fontSize(12).fillColor(mutedTextColor);
        doc.text(`Event Title: `, cardX + textIndent, cardY + 45, { continued: true })
           .fillColor(textColor).font('Helvetica-Bold').text(eventTitle || 'N/A', { align: 'right' });
        
        doc.fillColor(mutedTextColor).font('Helvetica').text(`Event Date: `, cardX + textIndent, cardY + 65, { continued: true })
           .fillColor(textColor).font('Helvetica-Bold').text(formattedEventDate, { align: 'right' });
        
        doc.moveDown(2); 

        // --- Total Amount ---
        doc.rect(50, doc.y - 10, doc.page.width - 100, 1) 
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

        doc.end();
    });
};

// 🚀 --- NEW & IMPROVED PROFESSIONAL INVOICE-STYLE PDF --- 🚀

/**
 * Generates a professional PDF donation receipt.
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
        const receiptNumber = paymentId ? `DON-${paymentId.slice(-10).toUpperCase()}` : `DON-N/A`;

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
        const tableHeaderColor = '#F3F4F6'; // Light gray
        const textColor = '#1F2937'; // Darker text
        const mutedTextColor = '#6B7280';
        const borderColor = '#E5E7EB';

        // --- 1. Header (Logo & Company Info) ---
        // ⚠️ IMPORTANT: Replace this with your logo's path on the server
        // Example: doc.image('public/images/logo.png', 50, 45, { fit: [150, 50] });
        // If no logo, use text:
        doc.fontSize(24).font('Helvetica-Bold').fillColor(primaryColor).text('ALUMNI NETWORK', 50, 50);

        // Company / Organization Info
        doc.font('Helvetica').fontSize(10).fillColor(textColor);
        doc.text('IGIT MCA Alumni Network', 400, 50, { align: 'right' });
        doc.text('Your University Address', 400, 65, { align: 'right' });
        doc.text('City, State, Pin', 400, 80, { align: 'right' });
        doc.text('mcaigitalumni@gmail.com', 400, 95, { align: 'right' });
        
        doc.moveDown(5);

        // --- 2. Title & Receipt Details ---
        doc.fontSize(22).font('Helvetica-Bold').fillColor(textColor).text('DONATION RECEIPT', 50, doc.y);
        doc.rect(50, doc.y + 5, doc.page.width - 100, 2).fill(primaryColor).stroke(primaryColor);
        doc.moveDown(1);

        // Receipt Details (Right Aligned)
        const infoTop = doc.y;
        doc.font('Helvetica-Bold').fontSize(10).fillColor(mutedTextColor).text('RECEIPT #:', 350, infoTop, { align: 'left' });
        doc.font('Helvetica').fillColor(textColor).text(receiptNumber, 450, infoTop, { align: 'right' });

        doc.font('Helvetica-Bold').fillColor(mutedTextColor).text('PAYMENT ID:', 350, infoTop + 15, { align: 'left' });
        doc.font('Helvetica').fillColor(textColor).text(paymentId || 'N/A', 450, infoTop + 15, { align: 'right' });

        doc.font('Helvetica-Bold').fillColor(mutedTextColor).text('DATE ISSUED:', 350, infoTop + 30, { align: 'left' });
        doc.font('Helvetica').fillColor(textColor).text(issueDate, 450, infoTop + 30, { align: 'right' });

        doc.font('Helvetica-Bold').fillColor(mutedTextColor).text('PAYMENT STATUS:', 350, infoTop + 45, { align: 'left' });
        doc.font('Helvetica-Bold').fillColor('#28a745').text('PAID', 450, infoTop + 45, { align: 'right' });

        // Bill To (Left Aligned)
        doc.font('Helvetica-Bold').fontSize(10).fillColor(mutedTextColor).text('BILL TO', 50, infoTop);
        doc.font('Helvetica-Bold').fontSize(12).fillColor(textColor).text(fullName, 50, infoTop + 15);
        doc.font('Helvetica').fillColor(mutedTextColor).text(email, 50, infoTop + 30);
        
        doc.y = infoTop + 70; // Set Y position below both blocks

        // --- 3. Itemized Table ---
        const tableTop = doc.y;
        const itemCol = 50;
        const totalCol = doc.page.width - 150;
        const amountCol = doc.page.width - 100;

        // Table Header
        doc.rect(50, tableTop, doc.page.width - 100, 25).fill(tableHeaderColor);
        doc.fillColor(mutedTextColor).font('Helvetica-Bold').fontSize(10);
        doc.text('DESCRIPTION', itemCol + 10, tableTop + 8);
        doc.text('TOTAL', amountCol - 10, tableTop + 8, { width: 50, align: 'right' });

        // Table Body
        const rowTop = tableTop + 35;
        doc.fillColor(textColor).font('Helvetica').fontSize(11);
        doc.text('Contribution to Alumni Network Fund', itemCol + 10, rowTop, { width: 300 });
        doc.font('Helvetica-Bold').text(`₹${amount}`, amountCol - 10, rowTop, { width: 50, align: 'right' });
        
        // --- 4. Total Section ---
        const totalTopPos = rowTop + 40;
        doc.rect(300, totalTopPos, doc.page.width - 350, 1).fill(borderColor).stroke(borderColor);
        doc.moveDown(0.5);

        doc.font('Helvetica-Bold').fontSize(12).fillColor(textColor);
        doc.text('Subtotal:', 300, doc.y, { align: 'left' });
        doc.text(`₹${amount}`, 440, doc.y - 12, { align: 'right' }); // -12 to align with "Subtotal"
        doc.moveDown(0.5);
        
        doc.rect(300, doc.y, doc.page.width - 350, 2).fill(primaryColor).stroke(primaryColor);
        doc.moveDown(0.5);

        doc.font('Helvetica-Bold').fontSize(14);
        doc.text('TOTAL PAID:', 300, doc.y, { align: 'left' });
        doc.text(`₹${amount}`, 440, doc.y - 14, { align: 'right' }); // -14 to align with "TOTAL PAID"

        // --- 5. Footer ---
        const pageBottom = doc.page.height - 100;
        doc.y = pageBottom;
        doc.rect(50, doc.y, doc.page.width - 100, 1).fill(borderColor).stroke(borderColor);
        doc.moveDown(1);
        
        doc.font('Helvetica-Bold').fontSize(12).fillColor(textColor).text('Thank You!', 50, doc.y, { align: 'center' });
        doc.moveDown(0.5);
        
        doc.font('Helvetica-Oblique').fontSize(10).fillColor(mutedTextColor);
        doc.text('This is an official receipt. Your generous contribution is greatly appreciated.', 50, doc.y, {
            align: 'center',
            width: doc.page.width - 100
        });

        // Finalize the PDF
        doc.end();
    });
};