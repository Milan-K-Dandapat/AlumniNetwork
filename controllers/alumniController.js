import Alumni from '../models/Alumni.js';
import sgMail from '@sendgrid/mail'; // <-- IMPORT SENDGRID

// --- SET YOUR API KEY ---
// (Make sure SENDGRID_API_KEY is in your .env file)
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
// --------------------------

/**
 * @desc    Get all alumni profiles (both verified and unverified)
 * @route   GET /api/alumni
 * @access  Private (Requires auth)
 */
export const getAlumni = async (req, res) => {
    try {
        const alumni = await Alumni.find({}).sort({ createdAt: -1 });
        res.status(200).json(alumni);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching alumni', error: error.message });
    }
};

/**
 * @desc    Verify an alumni profile
 * @route   PATCH /api/alumni/:id/verify
 * @access  Private (Admin / SuperAdmin)
 */
export const verifyAlumni = async (req, res) => {
    try {
        // --- SECURITY CHECK ---
        const userRole = req.user.role;
        const isSuperAdmin = req.user.email === 'milankumar7770@gmail.com';

        if (userRole !== 'admin' && !isSuperAdmin) {
             return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }
        // --- END SECURITY CHECK ---

        const alumni = await Alumni.findById(req.params.id);

        if (!alumni) {
            return res.status(404).json({ message: 'Alumni not found' });
        }

        // 1. UPDATE THE USER IN THE DATABASE
        alumni.isVerified = true;
        const updatedAlumni = await alumni.save();
        
        // --- 📧 START SENDGRID EMAIL LOGIC ---
        try {
            // 2. DEFINE THE EMAIL MESSAGE
            const msg = {
                to: updatedAlumni.email, // The user's email from the database
                
                // 🚨 IMPORTANT: Change this to your VERIFIED sender email in SendGrid
                from: 'mcaigitalumni@gmail.com', 
                
                subject: '🎉 Congratulations! Your Alumni Account is Verified!',
                
                // Plain text fallback for old email clients
                text: `Hello ${updatedAlumni.fullName},\n\nCongratulations! Your account on the Alumni Network has been successfully reviewed and verified by an administrator. You can now log in to access the full directory and connect with members.\n\nLog in here: https://your-website-login-page.com/login\n\nBest regards,\nThe Alumni Network Team`,
                
                // The new animated HTML template
                // This is the new HTML block. Paste this over the old one.
html: `
<style>
    @keyframes draw-circle {
        from { stroke-dashoffset: 315; }
        to { stroke-dashoffset: 0; }
    }
    @keyframes draw-check {
        from { stroke-dashoffset: 80; }
        to { stroke-dashoffset: 0; }
    }
    .circle-bg {
        fill: none;
        stroke: #e6e6e6;
        stroke-width: 8;
    }
    .circle-fg {
        fill: none;
        stroke: #0d133d; /* Dark Blue */
        stroke-width: 8;
        stroke-dasharray: 315;
        stroke-dashoffset: 315;
        animation: draw-circle 1s ease-out forwards;
        animation-delay: 0.2s;
    }
    .checkmark {
        fill: none;
        stroke: #181be8; /* Bright Blue */
        stroke-width: 10;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-dasharray: 80;
        stroke-dashoffset: 80;
        animation: draw-check 0.5s ease-out forwards;
        animation-delay: 0.8s;
    }
</style>
<div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    
    <div style="background: linear-gradient(135deg, #181be8 0%, #0d133d 100%); color: white; padding: 32px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Account Verified!</h1>
    </div>
    
    <div style="padding: 40px; text-align: center; color: #333;">
        
        <div style="width: 100px; height: 100px; margin: 0 auto 24px auto;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <circle class="circle-bg" cx="50" cy="50" r="47" />
                <circle class="circle-fg" cx="50" cy="50" r="47" />
                <path class="checkmark" d="M30 50 l20 20 l30 -30" />
            </svg>
        </div>
        
        <h2 style="font-size: 24px; color: #0d133d; margin-bottom: 16px;">
            Hello, ${
                // This checks if we are in the alumni or teacher controller
                // and uses the correct name.
                updatedAlumni ? updatedAlumni.fullName : updatedTeacher.fullName
            }!
        </h2>
        
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Congratulations! Your account on the <strong>Alumni Network</strong> has been successfully reviewed and verified by an administrator.
        </p>
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
            You can now log in to access the full directory, connect with members, and explore all our features.
        </p>
        
        <a 
            href="https://your-website-login-page.com/login" 
            style="background: linear-gradient(135deg, #181be8 0%, #0d133d 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; transition: transform 0.2s ease;"
            onmouseover="this.style.transform='scale(1.05)'" 
            onmouseout="this.style.transform='scale(1)'"
        >
            Log In Now
        </a>
    </div>
    
    <div style="background-color: #f9f9f9; color: #888; padding: 24px; text-align: center; font-size: 12px; border-top: 1px solid #eee;">
        <p style="margin: 0;">Best regards,<br>The MCA Alumni Network Team</p>
    </div>
</div>
`,
            };
            
            // 3. SEND THE EMAIL
            await sgMail.send(msg);
            console.log(`Verification email sent to ${updatedAlumni.email}`);

        } catch (emailError) {
            // Log the email error, but don't fail the API request.
            // The admin's action (verification) was still successful.
            console.error('SendGrid Error: Failed to send verification email.', emailError.response?.body || emailError);
        }
        // --- 📧 END SENDGRID EMAIL LOGIC ---

        
        // 4. SEND SUCCESS RESPONSE TO ADMIN
        // This tells the DirectoryPage.js that the verification was successful
        res.status(200).json(updatedAlumni);

    } catch (error) {
        console.error('Error verifying alumni:', error);
        res.status(500).json({ message: 'Error verifying alumni', error: error.message });
    }
};


/**
 * @desc    Delete an alumni profile
 * @route   DELETE /api/alumni/:id
 * @access  Private (Admin / SuperAdmin)
 */
export const deleteAlumni = async (req, res) => {
    // ... (Your delete logic is unchanged) ...
    try {
        const alumni = await Alumni.findById(req.params.id);

        if (!alumni) {
            return res.status(404).json({ message: 'Alumni not found' });
        }

        // --- NEW SECURITY CHECK ---
        const userRole = req.user.role;
        const isSuperAdmin = req.user.email === 'milankumar7770@gmail.com';

        if (isSuperAdmin) {
            // Super admin can delete anyone
            await Alumni.findByIdAndDelete(req.params.id);
            return res.status(200).json({ message: 'Alumni profile deleted successfully' });
        } 
        
        if (userRole === 'admin') {
            // Admin can ONLY delete unverified users
            if (alumni.isVerified) {
                return res.status(403).json({ message: 'Access denied. Admins can only delete unverified users.' });
            }
            
            await Alumni.findByIdAndDelete(req.params.id);
            return res.status(200).json({ message: 'Alumni profile deleted successfully' });
        }
        
        // If not super admin or admin, deny access
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        // --- END SECURITY CHECK ---

    } catch (error) {
        console.error('Error deleting alumni:', error);
        res.status(500).json({ message: 'Error deleting alumni', error: error.message });
    }
};