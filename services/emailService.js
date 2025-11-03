import nodemailer from 'nodemailer';

// Configure your email transporter using environment variables
const transporter = nodemailer.createTransport({
    // Use your email host (e.g., smtp.sendgrid.net, smtp.gmail.com)
    host: process.env.SMTP_HOST || 'smtp.example.com', 
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true' || false, 
    auth: {
        user: process.env.SMTP_USER || 'your_smtp_username', 
        pass: process.env.SMTP_PASS || 'your_smtp_password', 
    },
});

/**
 * Sends a congratulatory email to the user upon successful administrator verification.
 * @param {string} toEmail - The recipient's email address.
 * @param {string} fullName - The recipient's full name.
 */
export const sendCongratulatoryEmail = async (toEmail, fullName) => {
    try {
        const mailOptions = {
            // IMPORTANT: Set a valid 'from' address
            from: `IGIT MCA Alumni Network <${process.env.SMTP_USER || 'no-reply@yourdomain.com'}>`, 
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
                            <a href="${process.env.REACT_APP_DOMAIN_URL || 'http://localhost:3000'}/login" 
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
        console.error("Error sending congratulatory email:", error.message);
    }
};
