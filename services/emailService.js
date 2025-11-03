import nodemailer from 'nodemailer';

// --- SENDGRID CONFIGURATION ---
const transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net', 
    port: 587, 
    secure: false, 
    auth: {
        user: 'apikey', 
        pass: process.env.SENDGRID_API_KEY, 
    },
});

/**
 * Sends a congratulatory email to the user upon successful administrator verification.
 * @param {string} toEmail - The recipient's email address.
 * @param {string} fullName - The recipient's full name.
 */
export const sendCongratulatoryEmail = async (toEmail, fullName) => {
    // We are prioritizing the server-side DOMAIN_URL variable here.
    const domainUrl = process.env.DOMAIN_URL || process.env.REACT_APP_DOMAIN_URL || 'http://localhost:3000';
    
    try {
        const mailOptions = {
            from: `IGIT MCA Alumni Network <${process.env.EMAIL_USER || 'no-reply@yourdomain.com'}>`, 
            to: toEmail,
            subject: '🎉 Congratulations! Your Alumni Profile is Verified',
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #4f46e5; color: white; padding: 20px; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px;">Verification Successful!</h1>
                    </div>
                    <div style="padding: 20px;">
                        <p>Dear ${fullName},</p>
                        <p>We are excited to inform you that your profile on the **IGIT MCA Alumni Network** has been officially reviewed and **verified** by our administration. Your account is now fully active!</p>
                        
                        <p style="font-size: 1.1em; font-weight: bold; color: #4f46e5;">You can now log in and enjoy full access to the Alumni Directory, networking features, events, and all community resources.</p>

                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${domainUrl}/login" 
                                style="background-color: #10b981; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                                Go to Login
                            </a>
                        </div>
                        
                        <p>We are delighted to welcome you to the verified community.</p>
                        <p>Best regards,<br>The IGIT MCA Alumni Network Team</p>
                    </div>
                    <div style="background-color: #f7f7f7; padding: 10px; text-align: center; font-size: 12px; color: #777;">
                        This is an automated notification. Please do not reply to this email.
                    </div>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Congratulatory email sent: %s", info.messageId);

    } catch (error) {
        console.error("CRITICAL EMAIL FAILURE: Error sending congratulatory email. Check SendGrid API key and configuration:", error.message);
    }
};
