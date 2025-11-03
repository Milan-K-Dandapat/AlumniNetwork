import Teacher from '../models/Teacher.js';
import sgMail from '@sendgrid/mail'; // <-- 1. IMPORT SENDGRID

const SUPER_ADMIN_EMAIL = 'milankumar7770@gmail.com';

// --- 2. SET YOUR API KEY ---
// (Make sure SENDGRID_API_KEY is in your .env file)
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
// -----------------------------

/**
 * @desc    Get all teacher profiles (both verified and unverified)
 * @route   GET /api/teachers
 * @access  Private (Requires auth)
 */
export const getTeachers = async (req, res) => {
    try {
        const teachers = await Teacher.find({}).sort({ fullName: 1 });
        res.status(200).json(teachers);
    } catch (error) {
        console.error('Error fetching teachers:', error);
        res.status(500).json({ message: 'Error fetching teacher profiles.', error: error.message });
    }
};

/**
 * @desc    Verify a teacher profile
 * @route   PATCH /api/teachers/:id/verify
 * @access  Private (Admin / SuperAdmin)
 */
export const verifyTeacher = async (req, res) => {
    try {
        // --- SECURITY CHECK ---
        const userRole = req.user.role;
        const isSuperAdmin = req.user.email === SUPER_ADMIN_EMAIL;

        if (userRole !== 'admin' && !isSuperAdmin) {
             return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }
        // --- END SECURITY CHECK ---

        const teacher = await Teacher.findById(req.params.id);

        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        // 1. UPDATE THE USER IN THE DATABASE
        teacher.isVerified = true;
        const updatedTeacher = await teacher.save();
        
        // --- 📧 START SENDGRID EMAIL LOGIC ---
        try {
            // 2. DEFINE THE EMAIL MESSAGE
            const msg = {
                to: updatedTeacher.email, // The user's email from the database
                
                // 🚨 IMPORTANT: Change this to your VERIFIED sender email in SendGrid
                from: 'mcaigitalumni@gmail.com', 
                
                // Subject line specific to Faculty
                subject: '🎉 Congratulations! Your Faculty Account is Verified!',
                
                // Plain text fallback
                text: `Hello ${updatedTeacher.fullName},\n\nCongratulations! Your faculty account on the Alumni Network has been successfully reviewed and verified by an administrator. You can now log in to access the full directory and connect with members.\n\nLog in here: https://your-website-login-page.com/login\n\nBest regards,\nThe Alumni Network Team`,
                
                // The same animated HTML template
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
            console.log(`Verification email sent to ${updatedTeacher.email}`);

        } catch (emailError) {
            // Log the email error, but don't fail the API request.
            console.error('SendGrid Error: Failed to send verification email.', emailError.response?.body || emailError);
        }
        // --- 📧 END SENDGRID EMAIL LOGIC ---

        
        // 4. SEND SUCCESS RESPONSE TO ADMIN
        res.status(200).json(updatedTeacher);

    } catch (error) {
        console.error('Error verifying teacher:', error);
        res.status(500).json({ message: 'Error verifying teacher', error: error.message });
    }
};


/**
 * @desc    Delete a teacher profile
 * @route   DELETE /api/teachers/:id
 * @access  Private (Admin / SuperAdmin)
 */
export const deleteTeacher = async (req, res) => {
    // ... (Your delete logic is unchanged) ...
    try {
        const teacher = await Teacher.findById(req.params.id);

        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        // --- NEW SECURITY CHECK ---
        const userRole = req.user.role;
        const isSuperAdmin = req.user.email === SUPER_ADMIN_EMAIL;

        if (isSuperAdmin) {
            // Super admin can delete anyone
            await Teacher.findByIdAndDelete(req.params.id);
            return res.status(200).json({ message: 'Teacher profile deleted successfully' });
        } 
        
        if (userRole === 'admin') {
            // Admin can ONLY delete unverified users
            if (teacher.isVerified) {
                return res.status(403).json({ message: 'Access denied. Admins can only delete unverified users.' });
            }
            
            await Teacher.findByIdAndDelete(req.params.id);
            return res.status(200).json({ message: 'Teacher profile deleted successfully' });
        }
        
        // If not super admin or admin, deny access
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        // --- END SECURITY CHECK ---

    } catch (error) {
        console.error('Error deleting teacher:', error);
        res.status(500).json({ message: 'Error deleting teacher', error: error.message });
    }
};