import Alumni from '../models/Alumni.js';
import sgMail from '@sendgrid/mail'; // <-- IMPORT SENDGRID

// --- SET YOUR API KEY ---
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
// --------------------------

/**
 * @desc    Get all alumni profiles
 * @route   GET /api/alumni
 * @access  Private (Requires auth)
 */
export const getAlumni = async (req, res) => {
    // ... (Your getAlumni logic is unchanged) ...
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
        
        
        // --- 📧 START MERGED SENDGRID LOGIC ---
        if (updatedAlumni.email) {
            const msg = {
                to: updatedAlumni.email,
                
                // ✅ YOUR LOGIC: Using your 'from' address logic
                from: process.env.EMAIL_USER || 'igitmcaalumni@gmail.com', 
                
                // ✅ YOUR LOGIC: Using your requested emojis
                subject: '🥳 ✅ Congratulations! Your Alumni Account is Verified!',
                
                // ✅ MY DESIGN: The full animated email template
                html: `
<style>
    /* ... (all the CSS animation styles are here) ... */
    @keyframes draw-circle {
        from { stroke-dashoffset: 315; }
        to { stroke-dashoffset: 0; }
    }
    @keyframes draw-check {
        from { stroke-dashoffset: 80; }
        to { stroke-dashoffset: 0; }
    }
    .circle-bg { fill: none; stroke: #e6e6e6; stroke-width: 8; }
    .circle-fg {
        fill: none; stroke: #0d133d; stroke-width: 8;
        stroke-dasharray: 315; stroke-dashoffset: 315;
        animation: draw-circle 1s ease-out forwards; animation-delay: 0.2s;
    }
    .checkmark {
        fill: none; stroke: #181be8; stroke-width: 10;
        stroke-linecap: round; stroke-linejoin: round;
        stroke-dasharray: 80; stroke-dashoffset: 80;
        animation: draw-check 0.5s ease-out forwards; animation-delay: 0.8s;
    }
</style>
<div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    
    <div style="background: linear-gradient(135deg, #181be8 0%, #0d133d 100%); color: white; padding: 32px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Account Verified!</h1>
    </div>
    
    <div style="padding: 40px; text-align: center; color: #333;">
        
        <img 
            src="https://res.cloudinary.com/deyr9bouf/image/upload/v1762210764/logo_bh9u8i.png" 
            alt="IGIT MCA Alumni Network Logo" 
            width="100" 
            style="margin-bottom: 24px; border-radius: 8px;"
        />
        
        <h2 style="font-size: 24px; color: #0d133d; margin-bottom: 16px;">
            Hello, ${
                // This logic correctly gets the name from either controller
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
            href="https://igitmcaalumni.netlify.app/login" 
            style="background: linear-gradient(135deg, #181be8 0%, #0d133d 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;"
        >
            Log In Now
        </a>
    </div>
    
    <div style="background-color: #f9f9f9; color: #888; padding: 24px; text-align: center; font-size: 12px; border-top: 1px solid #eee;">
        <p style="margin: 0;">Best regards,<br>The IGIT MCA Alumni Network Team</p>
    </div>
</div>
`
            };
            try {
                await sgMail.send(msg);
                console.log(`Verification email sent successfully to ${updatedAlumni.email}`);
            } catch (emailError) {
                console.error(`Failed to send verification email to ${updatedAlumni.email}:`, emailError.response?.body || emailError.message);
            }
        } else {
            console.warn(`User ${updatedAlumni._id} approved but has no email address. Cannot send verification email.`);
        }
        // --- 📧 END MERGED SENDGRID LOGIC ---

        
        // 2. SEND SUCCESS RESPONSE TO ADMIN
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
        
        const userRole = req.user.role;
        const isSuperAdmin = req.user.email === 'milankumar7770@gmail.com';

        if (isSuperAdmin) {
            await Alumni.findByIdAndDelete(req.params.id);
            return res.status(200).json({ message: 'Alumni profile deleted successfully' });
        } 
        
        if (userRole === 'admin') {
            if (alumni.isVerified) {
                return res.status(403).json({ message: 'Access denied. Admins can only delete unverified users.' });
            }
            await Alumni.findByIdAndDelete(req.params.id);
            return res.status(200).json({ message: 'Alumni profile deleted successfully' });
        }
        
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });

    } catch (error) {
        console.error('Error deleting alumni:', error);
        res.status(500).json({ message: 'Error deleting alumni', error: error.message });
    }
};