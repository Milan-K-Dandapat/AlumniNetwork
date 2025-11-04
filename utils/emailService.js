import sgMail from '@sendgrid/mail';

// Set the API key from your .env file
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Sends a payment confirmation email.
 * @param {object} details - An object containing user and event details.
 * @param {string} details.email - The recipient's email address.
 * @param {string} details.fullName - The recipient's name.
 * @param {string} details.eventTitle - The title of the event.
 * @param {number} details.amount - The amount paid.
 */
export const sendPaymentConfirmationEmail = async (details) => {
    const { email, fullName, eventTitle, amount } = details;

    const msg = {
        to: email, // The user's email
        from: 'mcaigitalumni@gmail.com', // Your verified sender
        subject: `✔ Registration Confirmed for ${eventTitle}!`,
        
        // Plain text version (unchanged, for email clients that don't load HTML)
        text: `Hi ${fullName},\n\nThank you for registering for ${eventTitle}!\n\nYour payment of ₹${amount} was successful.\n\nWe look forward to seeing you there!\n\nBest,\nThe Alumni Network Team`,
        
        // 🚀 --- NEW ANIMATED HTML --- 🚀
        html: `
<body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td style="padding: 20px 0;">
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #e0e0e0;">
                    
                    <tr>
                        <td align="center" style="padding: 40px 0 20px 0;">
                            <img src="https://i.imgur.com/L1qQ8WJ.gif" alt="Success" width="80" height="80" style="display: block;">
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 0 40px 30px 40px; text-align: center;">
                            <h1 style="color: #333333; font-size: 28px; font-weight: 600; margin: 0 0 10px 0;">Registration Confirmed!</h1>
                            <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
                                Hi <strong>${fullName}</strong>,
                                <br><br>
                                Thank you for registering! Your payment was successful and your spot for <strong>${eventTitle}</strong> is secured.
                            </p>
                        </td>
                    </tr>
                    
                    <tr>
                        <td style="padding: 0 40px 30px 40px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9f9f9; border: 1px dashed #cccccc; border-radius: 8px; padding: 20px;">
                                <tr>
                                    <td style="padding: 8px 0; color: #666666; font-size: 15px; font-weight: bold;">Registrant:</td>
                                    <td align="right" style="padding: 8px 0; color: #333333; font-size: 15px;">${fullName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #666666; font-size: 15px; font-weight: bold;">Event:</td>
                                    <td align="right" style="padding: 8px 0; color: #333333; font-size: 15px;">${eventTitle}</td>
                                </tr>
                                <tr>
                                    <td style="padding-top: 15px; border-top: 1px solid #e0e0e0;">
                                        <strong style="color: #333333; font-size: 18px;">Total Paid:</strong>
                                    </td>
                                    <td align="right" style="padding-top: 15px; border-top: 1px solid #e0e0e0;">
                                        <strong style="color: #28a745; font-size: 18px;">₹${amount}</strong>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding: 0 40px 40px 40px;">
                            <a href="https://your-website.com/events/upcoming" target="_blank" style="display: inline-block; background-color: #3B82F6; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 8px; transition: background-color 0.3s;">
                                View More Events
                            </a>
                        </td>
                    </tr>
                    
                    <tr>
                        <td align="center" style="padding: 20px 40px; background-color: #f1f1f1; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;">
                            <p style="color: #888888; font-size: 12px; margin: 0;">
                                We look forward to seeing you there!
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
        `,
    };

    try {
        await sgMail.send(msg);
        console.log(`Payment confirmation email sent to ${email}`);
    } catch (error) {
        console.error('Error sending payment confirmation email:', error);
        if (error.response) {
            console.error(error.response.body);
        }
        // We throw the error so the calling function can catch it if needed
        throw error; 
    }
};