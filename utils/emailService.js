import nodemailer from 'nodemailer';

/**
 * Nodemailer transporter using SMTP2GO
 * Make sure these are set in your .env:
 * SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS
 */
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mail.smtp2go.com',
    port: Number(process.env.SMTP_PORT) || 2525,
    secure:
        process.env.SMTP_SECURE === 'true' ||
        Number(process.env.SMTP_PORT) === 465, // true only for 465
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Extra logging to confirm config (without password)
console.log('SMTP config in use:', {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure:
        process.env.SMTP_SECURE === 'true' ||
        Number(process.env.SMTP_PORT) === 465,
    user: process.env.SMTP_USER,
});

// Optional: verify connection on server start
transporter.verify((err, success) => {
    if (err) {
        console.error('SMTP Connection Error (SMTP2GO):', err.message);
    } else {
        console.log('SMTP Connection Success (SMTP2GO)!');
    }
});

/**
 * Generic helper to send any email
 * Used by other controllers (alumni/teacher/admin/etc.)
 */
export const sendEmail = async ({ to, subject, html, text, attachments, from }) => {
    const mailOptions = {
        from: from || process.env.EMAIL_FROM || 'MCA Alumni <mca@igitalumni.in>',
        to,
        subject,
        text,
        html,
        attachments,
    };

    return transporter.sendMail(mailOptions);
};

/**
 * Helper function to format the event date.
 * Adjust timeZone as needed.
 */
const formatEventDate = (date) => {
    if (!date) return 'Date TBD';
    try {
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            timeZone: 'Asia/Kolkata',
        };
        return new Date(date).toLocaleString('en-IN', options);
    } catch (e) {
        console.error('Error formatting date:', e);
        return 'Date TBD';
    }
};

/**
 * Sends a payment confirmation email.
 * @param {object} details - An object containing user and event details.
 */
export const sendPaymentConfirmationEmail = async (details) => {
    const {
        email,
        fullName,
        eventTitle,
        amount,
        eventDate,
        eventLocation,
        paymentId,
        pdfAttachment, // base64 PDF string
    } = details;

    const formattedDate = formatEventDate(eventDate);

    const subject = `✔ Registration Confirmed for ${eventTitle}!`;

    const text = `Hi ${fullName},\n\nRegistration Confirmed!\n\nThank you for registering. Your payment of ₹${amount} was successful and your spot for ${eventTitle} is secured.\n\nRECEIPT:\n- Registrant: ${fullName}\n- Event: ${eventTitle}\n- Amount Paid: ₹${amount}\n- Payment ID: ${paymentId}\n\nEVENT INFO:\n- When: ${formattedDate}\n- Where: ${eventLocation}\n\nWe look forward to seeing you there!\nBest,\nThe Alumni Network Team`;

    const html = `
<body style="margin: 0; padding: 0; background-color: #f6f7f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td style="padding: 20px 0;">
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.05);">
                    
                    <tr>
                        <td align="center" style="padding: 20px 0 15px 0; border-bottom: 1px solid #eeeeee;">
                            <img src="https://res.cloudinary.com/deyr9bouf/image/upload/v1762210764/logo_bh9u8i.png" alt="Alumni Network" width="180" style="display: block; -webkit-filter: drop-shadow(0 2px 2px rgba(0,0,0,0.1)); filter: drop-shadow(0 2px 2px rgba(0,0,0,0.1));">
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 40px 40px 20px 40px; text-align: left;">
                            <h1 style="color: #111111; font-size: 26px; font-weight: 600; margin: 0 0 15px 0;">Registration Confirmed!</h1>
                            <p style="color: #444444; font-size: 16px; line-height: 1.6; margin: 0;">
                                Hi <strong>${fullName}</strong>,
                                <br><br>
                                Thank you for registering! Your payment was successful and your spot for <strong>${eventTitle}</strong> is secured.
                            </p>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 10px 40px 30px 40px;">
                            <h2 style="font-size: 18px; color: #333; margin: 0 0 15px 0; border-bottom: 2px solid #3B82F6; padding-bottom: 5px;">Payment Receipt</h2>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fafafa; border: 1px solid #e0e0e0; border-radius: 8px;">
                                <tr>
                                    <td style="padding: 15px 20px; color: #666666; font-size: 15px; border-bottom: 1px solid #e0e0e0;">Registrant</td>
                                    <td align="right" style="padding: 15px 20px; color: #111111; font-size: 15px; font-weight: 500; border-bottom: 1px solid #e0e0e0;">${fullName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 15px 20px; color: #666666; font-size: 15px; border-bottom: 1px solid #e0e0e0;">Event</td>
                                    <td align="right" style="padding: 15px 20px; color: #111111; font-size: 15px; font-weight: 500; border-bottom: 1px solid #e0e0e0;">${eventTitle}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 15px 20px; color: #666666; font-size: 15px; border-bottom: 1px solid #e0e0e0;">Payment ID</td>
                                    <td align="right" style="padding: 15px 20px; color: #111111; font-size: 15px; font-weight: 500; border-bottom: 1px solid #e0e0e0;">${paymentId}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 20px; color: #333333; font-size: 17px; font-weight: 600;">Total Amount Paid</td>
                                    <td align="right" style="padding: 20px; color: #28a745; font-size: 17px; font-weight: 600;">₹${amount}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 10px 25px 30px 25px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f6f7f9; border-radius: 8px; padding: 20px 15px;">
                                <tr>
                                    <td width="33.33%" style="padding: 0 10px; vertical-align: top; text-align: center;">
                                        <img src="https://res.cloudinary.com/deyr9bouf/image/upload/v1762328020/pngwing.com_9_xjdggk.png" alt="Calendar" width="40" height="40" style="margin-bottom: 10px;">
                                        <h3 style="font-size: 14px; color: #111; margin: 0 0 5px 0;">When</h3>
                                        <p style="font-size: 13px; color: #555; line-height: 1.5; margin: 0;">${formattedDate}</p>
                                    </td>
                                    <td width="33.33%" style="padding: 0 10px; vertical-align: top; text-align: center; border-left: 1px solid #ddd; border-right: 1px solid #ddd;">
                                        <img src="https://res.cloudinary.com/deyr9bouf/image/upload/v1762328170/pngwing.com_10_jzni2a.png" alt="Location" width="40" height="40" style="margin-bottom: 10px;">
                                        <h3 style="font-size: 14px; color: #111; margin: 0 0 5px 0;">Where</h3>
                                        <p style="font-size: 13px; color: #555; line-height: 1.5; margin: 0;">${eventLocation}</p>
                                    </td>
                                    <td width="33.33%" style="padding: 0 10px; vertical-align: top; text-align: center;">
                                        <img src="https://res.cloudinary.com/deyr9bouf/image/upload/v1762328359/pngwing.com_12_fgmbgm.png" alt="Contact" width="40" height="40" style="margin-bottom: 10px;">
                                        <h3 style="font-size: 14px; color: #111; margin: 0 0 5px 0;">Have Questions?</h3>
                                        <p style="font-size: 13px; color: #555; line-height: 1.5; margin: 0;">Contact us at<br><a href="mailto:mca@igitalumni.in" style="color: #3B82F6; text-decoration: none;">mca@igitalumni.in</a></p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <tr>
                        <td align="center" style="padding: 20px 40px; border-top: 1px solid #eeeeee;">
                            <p style="color: #888888; font-size: 12px; margin: 0;">
                                You are receiving this email because you registered for an event.
                                <br><br>
                                Best,
                                <br>
                                The Alumni Network Team
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
        `;

    const attachments = [
        {
            content: pdfAttachment, // base64 string
            filename: `receipt-${paymentId || 'event'}.pdf`,
            contentType: 'application/pdf',
            encoding: 'base64',
        },
    ];

    try {
        await sendEmail({
            to: email,
            subject,
            text,
            html,
            attachments,
            from: 'MCA Alumni <mca@igitalumni.in>',
        });
        console.log(`Payment confirmation email sent to ${email} (with PDF)`);
    } catch (error) {
        console.error('Error sending payment confirmation email:', error);
        throw error;
    }
};

/**
 * Sends a donation confirmation email.
 * @param {object} details - An object containing donor and payment details.
 */
export const sendDonationEmail = async (details) => {
    const {
        email,
        fullName,
        amount,
        paymentId,
        pdfAttachment,
    } = details;

    const subject = 'Thank You for Your Generous Donation!';
    const text = `Hi ${fullName},\n\nThank you for your generous donation of ₹${amount} to the Alumni Network. Your contribution is invaluable.\n\nYour receipt is attached.\n\nPayment ID: ${paymentId}\n\nBest regards,\nThe Alumni Network Team`;

    const html = `
<body style="margin: 0; padding: 0; background-color: #f6f7f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td style="padding: 20px 0;">
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.05);">
                    
                    <tr>
                        <td align="center" style="padding: 20px 0 15px 0; border-bottom: 1px solid #eeeeee;">
                            <img src="https://res.cloudinary.com/deyr9bouf/image/upload/v1762210764/logo_bh9u8i.png" alt="Alumni Network" width="180" style="display: block;">
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 40px 40px 20px 40px; text-align: left;">
                            <h1 style="color: #111111; font-size: 26px; font-weight: 600; margin: 0 0 15px 0;">Thank You, ${fullName}!</h1>
                            <p style="color: #444444; font-size: 16px; line-height: 1.6; margin: 0;">
                                We are incredibly grateful for your generous donation of <strong>₹${amount}</strong>.
                                <br><br>
                                Your support helps us fund scholarships, organize events, and strengthen our alumni community. A receipt for your contribution is attached to this email.
                            </p>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 10px 40px 30px 40px;">
                            <h2 style="font-size: 18px; color: #333; margin: 0 0 15px 0; border-bottom: 2px solid #3B82F6; padding-bottom: 5px;">Donation Summary</h2>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fafafa; border: 1px solid #e0e0e0; border-radius: 8px;">
                                <tr>
                                    <td style="padding: 15px 20px; color: #666666; font-size: 15px; border-bottom: 1px solid #e0e0e0;">Donor</td>
                                    <td align="right" style="padding: 15px 20px; color: #111111; font-size: 15px; font-weight: 500; border-bottom: 1px solid #e0e0e0;">${fullName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 15px 20px; color: #666666; font-size: 15px; border-bottom: 1px solid #e0e0e0;">Payment ID</td>
                                    <td align="right" style="padding: 15px 20px; color: #111111; font-size: 15px; font-weight: 500; border-bottom: 1px solid #e0e0e0;">${paymentId}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 20px; color: #333333; font-size: 17px; font-weight: 600;">Amount Donated</td>
                                    <td align="right" style="padding: 20px; color: #28a745; font-size: 17px; font-weight: 600;">₹${amount}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <tr>
                        <td align="center" style="padding: 20px 40px; border-top: 1px solid #eeeeee;">
                            <p style="color: #888888; font-size: 12px; margin: 0;">
                                Best regards,
                                <br>
                                The Alumni Network Team
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
        `;

    const attachments = [
        {
            content: pdfAttachment,
            filename: `donation-receipt-${paymentId}.pdf`,
            contentType: 'application/pdf',
            encoding: 'base64',
        },
    ];

    try {
        await sendEmail({
            to: email,
            subject,
            text,
            html,
            attachments,
            from: 'MCA Alumni <mca@igitalumni.in>',
        });
        console.log(`Donation confirmation email sent to ${email} (with PDF)`);
    } catch (error) {
        console.error('Error sending donation confirmation email:', error);
        throw error;
    }
};

// 🚀 --- NEW FUNCTION ADDED FOR FREE EVENTS --- 🚀

/**
 * Sends a registration confirmation email for a FREE event.
 * @param {object} details - An object containing user and event details.
 */
export const sendFreeEventEmail = async (details) => {
    const {
        email,
        fullName,
        eventTitle,
        eventDate,
        eventLocation,
        receiptId, // We use receiptId instead of paymentId
        pdfAttachment,
    } = details;

    const formattedDate = formatEventDate(eventDate);

    const subject = `🎉 Congratulations! Your Spot is Confirmed for ${eventTitle}!`;
    const text = `Hi ${fullName},\n\nCongratulations! Your spot is confirmed for ${eventTitle}.\n\nThis is a free event, and we're excited to have you join us. Your confirmation is attached.\n\nEVENT INFO:\n- When: ${formattedDate}\n- Where: ${eventLocation}\n\nWe look forward to seeing you there!\nBest,\nThe Alumni Network Team`;

    const html = `
<body style="margin: 0; padding: 0; background-color: #f6f7f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td style="padding: 20px 0;">
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.05);">
                    
                    <tr>
                        <td align="center" style="padding: 20px 0 15px 0; border-bottom: 1px solid #eeeeee;">
                            <img src="https://res.cloudinary.com/deyr9bouf/image/upload/v1762210764/logo_bh9u8i.png" alt="Alumni Network" width="180" style="display: block;">
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 40px 40px 20px 40px; text-align: left;">
                            <h1 style="color: #111111; font-size: 26px; font-weight: 600; margin: 0 0 15px 0;">🎉 Congratulations, ${fullName}!</h1>
                            <p style="color: #444444; font-size: 16px; line-height: 1.6; margin: 0;">
                                Your spot is confirmed for the free event: <strong>${eventTitle}</strong>.
                                <br><br>
                                We are excited to have you join us. A confirmation for your records is attached to this email.
                            </p>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 10px 40px 30px 40px;">
                            <h2 style="font-size: 18px; color: #333; margin: 0 0 15px 0; border-bottom: 2px solid #3B82F6; padding-bottom: 5px;">Registration Summary</h2>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fafafa; border: 1px solid #e0e0e0; border-radius: 8px;">
                                <tr>
                                    <td style="padding: 15px 20px; color: #666666; font-size: 15px; border-bottom: 1px solid #e0e0e0;">Registrant</td>
                                    <td align="right" style="padding: 15px 20px; color: #111111; font-size: 15px; font-weight: 500; border-bottom: 1px solid #e0e0e0;">${fullName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 15px 20px; color: #666666; font-size: 15px; border-bottom: 1px solid #e0e0e0;">Event</td>
                                    <td align="right" style="padding: 15px 20px; color: #111111; font-size: 15px; font-weight: 500; border-bottom: 1px solid #e0e0e0;">${eventTitle}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 20px; color: #333333; font-size: 17px; font-weight: 600;">Total Amount</td>
                                    <td align="right" style="padding: 20px; color: #28a745; font-size: 17px; font-weight: 600;">₹0.00 (Free)</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 10px 25px 30px 25px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f6f7f9; border-radius: 8px; padding: 20px 15px;">
                                <tr>
                                    <td width="33.33%" style="padding: 0 10px; vertical-align: top; text-align: center;">
                                        <img src="https://res.cloudinary.com/deyr9bouf/image/upload/v1762328020/pngwing.com_9_xjdggk.png" alt="Calendar" width="40" height="40" style="margin-bottom: 10px;">
                                        <h3 style="font-size: 14px; color: #111; margin: 0 0 5px 0;">When</h3>
                                        <p style="font-size: 13px; color: #555; line-height: 1.5; margin: 0;">${formattedDate}</p>
                                    </td>
                                    <td width="33.33%" style="padding: 0 10px; vertical-align: top; text-align: center; border-left: 1px solid #ddd; border-right: 1px solid #ddd;">
                                        <img src="https://res.cloudinary.com/deyr9bouf/image/upload/v1762328170/pngwing.com_10_jzni2a.png" alt="Location" width="40" height="40" style="margin-bottom: 10px;">
                                        <h3 style="font-size: 14px; color: #111; margin: 0 0 5px 0;">Where</h3>
                                        <p style="font-size: 13px; color: #555; line-height: 1.5; margin: 0;">${eventLocation}</p>
                                    </td>
                                    <td width="33.33%" style="padding: 0 10px; vertical-align: top; text-align: center;">
                                        <img src="https://res.cloudinary.com/deyr9bouf/image/upload/v1762328359/pngwing.com_12_fgmbgm.png" alt="Contact" width="40" height="40" style="margin-bottom: 10px;">
                                        <h3 style="font-size: 14px; color: #111; margin: 0 0 5px 0;">Have Questions?</h3>
                                        <p style="font-size: 13px; color: #555; line-height: 1.5; margin: 0;">Contact us at<br><a href="mailto:mca@igitalumni.in" style="color: #3B82F6; text-decoration: none;">mca@igitalumni.in</a></p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <tr>
                        <td align="center" style="padding: 20px 40px; border-top: 1px solid #eeeeee;">
                            <p style="color: #888888; font-size: 12px; margin: 0;">
                                Best,
                                <br>
                                The Alumni Network Team
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
        `;

    const attachments = [
        {
            content: pdfAttachment,
            filename: `confirmation-${receiptId}.pdf`,
            contentType: 'application/pdf',
            encoding: 'base64',
        },
    ];

    try {
        await sendEmail({
            to: email,
            subject,
            text,
            html,
            attachments,
            from: 'MCA Alumni <mca@igitalumni.in>',
        });
        console.log(`Free event confirmation email sent to ${email} (with PDF)`);
    } catch (error) {
        console.error('Error sending free event email:', error);
        throw error;
    }
};
