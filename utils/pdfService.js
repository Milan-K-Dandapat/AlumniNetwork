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
        doc.fontSize(24).font('Helvetica-Bold').fillColor(primaryColor).text('ALUMNI NETWORK', 50, 50);
        doc.font('Helvetica').fontSize(10).fillColor(textColor);
        doc.text('IGIT MCA Alumni Network', 400, 50, { align: 'right' });
        doc.text('IGIT Sarang', 400, 65, { align: 'right' });
        doc.text('Dhenkanal, Odisha, 759146', 400, 80, { align: 'right' });
        doc.text('mcaigitalumni@gmail.com', 400, 95, { align: 'right' });
        doc.moveDown(5);

        // --- 2. Title & Receipt Details ---
        doc.fontSize(22).font('Helvetica-Bold').fillColor(textColor).text('REGISTRATION RECEIPT', 50, doc.y);
        doc.rect(50, doc.y + 5, doc.page.width - 100, 2).fill(primaryColor).stroke(primaryColor);
        doc.moveDown(1);

        // --- 🚀 FIX: DYNAMIC Y-POSITIONING ---
        const infoTop = doc.y;
        
        // Bill To (Left Aligned)
        doc.font('Helvetica-Bold').fontSize(10).fillColor(mutedTextColor).text('REGISTRANT', 50, infoTop);
        doc.font('Helvetica-Bold').fontSize(12).fillColor(textColor).text(fullName, 50, infoTop + 15);
        doc.font('Helvetica').fillColor(mutedTextColor).text(email, 50, infoTop + 30);
        const leftColBottom = doc.y; // Get bottom of left column

        // Receipt Details (Right Aligned - Drawn sequentially)
        let rightColY = infoTop;
        const rightColLabelX = 350;
        const rightColValueX = 450;
        const rightColWidth = 95; // (PageWidth - Margin - X) = 595 - 50 - 450 = 95
        
        doc.font('Helvetica-Bold').fontSize(10).fillColor(mutedTextColor).text('RECEIPT #:', rightColLabelX, rightColY, { align: 'left' });
        doc.font('Helvetica').fillColor(textColor).text(receiptNumber, rightColValueX, rightColY, { align: 'right', width: rightColWidth });
        rightColY = doc.y + 5; // Move Y *after* drawing

        doc.font('Helvetica-Bold').fillColor(mutedTextColor).text('PAYMENT ID:', rightColLabelX, rightColY, { align: 'left' });
        doc.font('Helvetica').fillColor(textColor).text(paymentId || 'N/A', rightColValueX, rightColY, { align: 'right', width: rightColWidth });
        rightColY = doc.y + 5;

        doc.font('Helvetica-Bold').fillColor(mutedTextColor).text('DATE ISSUED:', rightColLabelX, rightColY, { align: 'left' });
        doc.font('Helvetica').fillColor(textColor).text(issueDate, rightColValueX, rightColY, { align: 'right', width: rightColWidth });
        rightColY = doc.y + 5;

        doc.font('Helvetica-Bold').fillColor(mutedTextColor).text('PAYMENT STATUS:', rightColLabelX, rightColY, { align: 'left' });
        doc.font('Helvetica-Bold').fillColor(successColor).text('PAID', rightColValueX, rightColY, { align: 'right', width: rightColWidth });
        
        // Set doc.y to the bottom of whichever column is tallest
        doc.y = Math.max(leftColBottom, doc.y) + 20;
        // --- 🚀 END FIX ---

        // --- 3. Itemized Table ---
        const tableTop = doc.y;
        const itemCol = 50;
        const amountCol = doc.page.width - 100;

        // Table Header
        doc.rect(50, tableTop, doc.page.width - 100, 25).fill(tableHeaderColor);
        doc.fillColor(mutedTextColor).font('Helvetica-Bold').fontSize(10);
        doc.text('DESCRIPTION', itemCol + 10, tableTop + 8);
        doc.text('TOTAL', amountCol - 10, tableTop + 8, { width: 50, align: 'right' });

        // Table Body
        const rowTop = tableTop + 35;
        const descriptionX = itemCol + 10;
        const priceX = amountCol - 10;
        
        doc.font('Helvetica-Bold').fontSize(11).text(`₹${amount}`, priceX, rowTop, { width: 50, align: 'right' });
        const priceY = doc.y;

        doc.fillColor(textColor).font('Helvetica-Bold').fontSize(11);
        doc.text(`Event Registration: ${eventTitle}`, descriptionX, rowTop, { width: 300 });
        const titleBottomY = doc.y;
        
        doc.font('Helvetica-Oblique').fontSize(9).fillColor(mutedTextColor).text(`Event Date: ${formattedEventDate}`, descriptionX, titleBottomY + 2, { width: 300 });
        const dateBottomY = doc.y;

        const rowBottomY = Math.max(dateBottomY, priceY);
        
        // --- 4. Total Section ---
        const totalTopPos = rowBottomY + 20; 
        doc.rect(300, totalTopPos, doc.page.width - 350, 1).fill(borderColor).stroke(borderColor);
        
        let totalY = totalTopPos + 10;
        doc.font('Helvetica-Bold').fontSize(12).fillColor(textColor);
        doc.text('Subtotal:', 300, totalY, { align: 'left' });
        doc.text(`₹${amount}`, 440, totalY, { align: 'right' });
        totalY += 20;
        
        doc.rect(300, totalY, doc.page.width - 350, 2).fill(primaryColor).stroke(primaryColor);
        totalY += 5;

        doc.font('Helvetica-Bold').fontSize(14);
        doc.text('TOTAL PAID:', 300, totalY, { align: 'left' });
        doc.text(`₹${amount}`, 440, totalY, { align: 'right' });

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
        
        let totalY = totalTopPos + 10;
        doc.font('Helvetica-Bold').fontSize(12).fillColor(textColor);
        doc.text('Subtotal:', 300, totalY, { align: 'left' });
        doc.text(`₹${amount}`, 440, totalY, { align: 'right' });
        totalY += 20;
        
        doc.rect(300, totalY, doc.page.width - 350, 2).fill(primaryColor).stroke(primaryColor);
        totalY += 5;

        doc.font('Helvetica-Bold').fontSize(14);
        doc.text('Total Donated:', 300, totalY, { align: 'left' });
        doc.text(`₹${amount}`, 440, totalY, { align: 'right' });

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

// 🚀 --- UPDATED FREE EVENT PDF FUNCTION --- 🚀

/**
 * Generates a professional PDF event confirmation for a FREE event.
 * @param {object} details - The registration and event details.
 */
export const generateFreeReceiptPDF = (details) => {
    return new Promise((resolve, reject) => {
        const {
            fullName,
            email,
            eventTitle,
            eventDate,
            receiptId // Use the Registration ID
        } = details;

        const formattedEventDate = formatPdfDate(eventDate, true); // Include time for event date
        const issueDate = formatPdfDate(new Date());
        const receiptNumber = `REG-FREE-${receiptId.slice(-10).toUpperCase()}`;

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
        const successColor = '#10B981'; // Green

        // --- 1. Header (Logo & Company Info) ---
        doc.fontSize(24).font('Helvetica-Bold').fillColor(primaryColor).text('ALUMNI NETWORK', 50, 50);

        doc.font('Helvetica').fontSize(10).fillColor(textColor);
        doc.text('IGIT MCA Alumni Network', 400, 50, { align: 'right' });
        doc.text('IGIT Sarang', 400, 65, { align: 'right' });
        doc.text('Dhenkanal, Odisha, 759146', 400, 80, { align: 'right' });
        doc.text('mcaigitalumni@gmail.com', 400, 95, { align: 'right' });
        
        doc.moveDown(5);

        // --- 2. Title & Receipt Details ---
        doc.fontSize(22).font('Helvetica-Bold').fillColor(textColor).text('REGISTRATION CONFIRMATION', 50, doc.y);
        doc.rect(50, doc.y + 5, doc.page.width - 100, 2).fill(primaryColor).stroke(primaryColor);
        doc.moveDown(1);

        // --- 🚀 FIX: DYNAMIC Y-POSITIONING ---
        const infoTop = doc.y;

        // Bill To (Left Aligned)
        doc.font('Helvetica-Bold').fontSize(10).fillColor(mutedTextColor).text('REGISTRANT', 50, infoTop);
        doc.font('Helvetica-Bold').fontSize(12).fillColor(textColor).text(fullName, 50, infoTop + 15);
        doc.font('Helvetica').fillColor(mutedTextColor).text(email, 50, infoTop + 30);
        const leftColBottom = doc.y; // Get bottom of left column

        // Receipt Details (Right Aligned - Drawn sequentially)
        let rightColY = infoTop;
        const rightColLabelX = 350;
        const rightColValueX = 450;
        const rightColWidth = 95; // (PageWidth - Margin - X) = 595 - 50 - 450 = 95

        doc.font('Helvetica-Bold').fontSize(10).fillColor(mutedTextColor).text('CONFIRMATION #:', rightColLabelX, rightColY, { align: 'left' });
        doc.font('Helvetica').fillColor(textColor).text(receiptNumber, rightColValueX, rightColY, { align: 'right', width: rightColWidth });
        rightColY = doc.y + 5; // Move Y *after* drawing

        doc.font('Helvetica-Bold').fillColor(mutedTextColor).text('DATE ISSUED:', rightColLabelX, rightColY, { align: 'left' });
        doc.font('Helvetica').fillColor(textColor).text(issueDate, rightColValueX, rightColY, { align: 'right', width: rightColWidth });
        rightColY = doc.y + 5;

        doc.font('Helvetica-Bold').fillColor(mutedTextColor).text('STATUS:', rightColLabelX, rightColY, { align: 'left' });
        doc.font('Helvetica-Bold').fillColor(successColor).text('CONFIRMED', rightColValueX, rightColY, { align: 'right', width: rightColWidth });
        
        // Set doc.y to the bottom of whichever column is tallest
        doc.y = Math.max(leftColBottom, doc.y) + 20; 
        // --- 🚀 END FIX ---

        // --- 3. Itemized Table ---
        const tableTop = doc.y;
        const itemCol = 50;
        const amountCol = doc.page.width - 100;

        // Table Header
        doc.rect(50, tableTop, doc.page.width - 100, 25).fill(tableHeaderColor);
        doc.fillColor(mutedTextColor).font('Helvetica-Bold').fontSize(10);
        doc.text('DESCRIPTION', itemCol + 10, tableTop + 8);
        doc.text('TOTAL', amountCol - 10, tableTop + 8, { width: 50, align: 'right' });

        // Table Body
        const rowTop = tableTop + 35;
        const descriptionX = itemCol + 10;
        const priceX = amountCol - 10;
        
        doc.font('Helvetica-Bold').fontSize(11).text('₹0.00', priceX, rowTop, { width: 50, align: 'right' });
        const priceY = doc.y;

        doc.fillColor(textColor).font('Helvetica-Bold').fontSize(11);
        doc.text(`Free Registration: ${eventTitle}`, descriptionX, rowTop, { width: 300 });
        const titleBottomY = doc.y;
        
        doc.font('Helvetica-Oblique').fontSize(9).fillColor(mutedTextColor);
        doc.text(`Event Date: ${formattedEventDate}`, descriptionX, titleBottomY + 2, { width: 300 });
        const dateBottomY = doc.y;

        const rowBottomY = Math.max(dateBottomY, priceY);
        
        // --- 4. Total Section ---
        const totalTopPos = rowBottomY + 20; 
        doc.rect(300, totalTopPos, doc.page.width - 350, 1).fill(borderColor).stroke(borderColor);
        
        let totalY = totalTopPos + 10;
        doc.font('Helvetica-Bold').fontSize(14).fillColor(textColor);
        doc.text('TOTAL:', 300, totalY, { align: 'left' });
        doc.text('₹0.00', 440, totalY, { align: 'right' });

        // --- 5. Footer ---
        const pageBottom = doc.page.height - 100;
        doc.y = pageBottom;
        doc.rect(50, doc.y, doc.page.width - 100, 1).fill(borderColor).stroke(borderColor);
        doc.moveDown(1);
        
        doc.font('Helvetica-Bold').fontSize(12).fillColor(textColor).text('See You There!', 50, doc.y, { align: 'center' });
        doc.moveDown(0.5);
        
        doc.font('Helvetica-Oblique').fontSize(10).fillColor(mutedTextColor);
        doc.text('This is an official confirmation for your free event registration.', 50, doc.y, {
            align: 'center',
            width: doc.page.width - 100
        });

        // Finalize the PDF
        doc.end();
    });
};