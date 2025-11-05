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

// 🚀 --- UPDATED EVENT RECEIPT FUNCTION --- 🚀
/**
 * Generates a professional PDF event receipt.
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
        const receiptNumber = paymentId ? `REG-${paymentId.slice(-10).toUpperCase()}` : `REG-N/A`;

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
        const successColor = '#10B981';

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
        doc.fontSize(22).font('Helvetica-Bold').fillColor(textColor).text('REGISTRATION RECEIPT', 50, doc.y);
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
        doc.font('Helvetica-Bold').fillColor(successColor).text('PAID', 450, infoTop + 45, { align: 'right' });

        // Bill To (Left Aligned)
        doc.font('Helvetica-Bold').fontSize(10).fillColor(mutedTextColor).text('REGISTRANT', 50, infoTop);
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
        doc.fillColor(textColor).font('Helvetica-Bold').fontSize(11);
        doc.text(`Event Registration: ${eventTitle}`, itemCol + 10, rowTop, { width: 300 });
        
        doc.font('Helvetica-Oblique').fontSize(9).fillColor(mutedTextColor).text(`Event Date: ${formattedEventDate}`, itemCol + 10, rowTop + 15, { width: 300 });

        doc.font('Helvetica-Bold').fontSize(11).text(`₹${amount}`, amountCol - 10, rowTop, { width: 50, align: 'right' });
        
        // --- 4. Total Section ---
        const totalTopPos = rowTop + 50; // Adjusted for the extra line
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
        doc.text('This is an official receipt. We look forward to seeing you at the event.', 50, doc.y, {
            align: 'center',
            width: doc.page.width - 100
        });

        // Finalize the PDF
        doc.end();
    });
};

// --- PROFESSIONAL DONATION PDF FUNCTION (Unchanged) ---

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
        // Create a unique, shorter receipt number
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
        const tableHeaderColor = '#F3F4F6'; // A light gray for the table header
        const textColor = '#1F2937';
        const mutedTextColor = '#6B7280';
        const borderColor = '#E5E7EB';
        const successColor = '#10B981';

        // --- 1. Header (Logo & Company Info) ---
        
        // ⚠️ IMPORTANT: Replace this with your logo's path on the server
        // Example: doc.image('public/images/logo.png', 50, 45, { fit: [150, 50] });
        // If you don't have an image path, you can use text:
        doc.fontSize(28)
           .font('Helvetica-Bold')
           .fillColor(primaryColor)
           .text('ALUMNI NETWORK', 50, 50);
        doc.fontSize(10)
            .font('Helvetica')
            .fillColor(mutedTextColor)
            .text('mcaigitalumni@gmail.com', 50, 80);

        // Receipt Title
        doc.fontSize(28)
           .font('Helvetica-Bold')
           .fillColor(textColor)
           .text('DONATION RECEIPT', 250, 50, { align: 'right' });
        
        doc.fontSize(11)
           .font('Helvetica')
           .fillColor(mutedTextColor)
           .text(`Receipt #: ${receiptNumber}`, 250, 80, { align: 'right' });
        
        doc.fontSize(11)
           .font('Helvetica')
           .fillColor(mutedTextColor)
           .text(`Date Issued: ${issueDate}`, 250, 95, { align: 'right' });

        doc.moveDown(4); // Add space after header

        // --- 2. Donor Information ---
        doc.fillColor(mutedTextColor)
           .fontSize(10)
           .font('Helvetica-Bold')
           .text('DONOR INFORMATION', 50, doc.y);
           
        doc.fillColor(textColor)
           .fontSize(12)
           .font('Helvetica-Bold')
           .text(fullName, 50, doc.y + 5);
           
        doc.fillColor(mutedTextColor)
           .font('Helvetica')
           .text(email, 50, doc.y + 5);
        doc.moveDown(3);

        // --- 3. Thank You Message ---
        doc.fillColor(textColor)
           .font('Helvetica')
           .fontSize(12)
           .text(`Dear ${fullName},`, 50, doc.y);
        doc.moveDown(0.5);
        doc.text('We are incredibly grateful for your generous contribution. Your support is invaluable in helping us fund scholarships, organize events, and strengthen our alumni community. Please accept this as your official receipt.', {
            width: doc.page.width - 100,
            align: 'left'
        });
        doc.moveDown(3);

        // --- 4. Itemized Table ---
        const tableTop = doc.y;
        const itemCol = 50;
        const totalCol = doc.page.width - 150;
        const amountCol = doc.page.width - 100;

        // Table Header
        doc.rect(50, tableTop, doc.page.width - 100, 25)
           .fill(tableHeaderColor);
           
        doc.fillColor(mutedTextColor)
           .font('Helvetica-Bold')
           .fontSize(10)
           .text('DESCRIPTION', itemCol + 10, tableTop + 8);
           
        doc.text('AMOUNT', amountCol - 10, tableTop + 8, { width: 50, align: 'right' });

        // Table Body
        const rowTop = tableTop + 35;
        doc.fillColor(textColor)
           .font('Helvetica')
           .fontSize(11)
           .text('Contribution to Alumni Network Fund', itemCol + 10, rowTop, { width: 300 });
           
        doc.font('Helvetica-Bold').text(`₹${amount}`, amountCol - 10, rowTop, { width: 50, align: 'right' });
        
        // Bottom border for the row
        doc.rect(50, rowTop + 20, doc.page.width - 100, 1)
           .fill(borderColor)
           .stroke(borderColor);
           
        doc.moveDown(3);

        // --- 5. Total ---
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
        doc.text('Total Donated:', 300, doc.y, { align: 'left' });
        doc.text(`₹${amount}`, 440, doc.y - 14, { align: 'right' }); // -14 to align with "TOTAL PAID"

        // --- 6. Footer ---
        const pageBottom = doc.page.height - 100;
        doc.y = pageBottom;
        doc.rect(50, doc.y, doc.page.width - 100, 1).fill(borderColor).stroke(borderColor);
        doc.moveDown(1);
        
        doc.font('Helvetica-Bold').fontSize(12).fillColor(textColor).text('Thank You!', 50, doc.y, { align: 'center' });
        doc.moveDown(0.5);
        
        doc.font('Helvetica-Oblique').fontSize(10).fillColor(mutedTextColor);
        doc.text('This is an official receipt. Thank you for your generous contribution.', 50, doc.y, {
            align: 'center',
            width: doc.page.width - 100
        });

        // Finalize the PDF
        doc.end();
    });
};