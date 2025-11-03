import Alumni from '../models/Alumni.js';
// Assumes services/emailService.js is located one directory up from the controllers folder
import { sendCongratulatoryEmail } from '../services/emailService.js'; 

/**
 * @desc    Get all alumni profiles (both verified and unverified)
 * @route   GET /api/alumni
 * @access  Private (Requires auth)
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
 * @desc    Verify an alumni profile
 * @route   PATCH /api/alumni/:id/verify
 * @access  Private (Admin / SuperAdmin)
 */
export const verifyAlumni = async (req, res) => {
    try {
        // --- SECURITY CHECK (Ensures only Admin/SuperAdmin can execute) ---
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
        
        // 1. Check current verification status BEFORE updating
        const wasVerified = alumni.isVerified;

        // 2. Perform verification update
        alumni.isVerified = true;
        const updatedAlumni = await alumni.save();
        
        // 3. ⭐ EMAIL LOGIC: Send email ONLY if the user was NOT previously verified ⭐
        if (!wasVerified && updatedAlumni.isVerified) {
            // Call the email service asynchronously so the verification request remains fast
            sendCongratulatoryEmail(updatedAlumni.email, updatedAlumni.fullName);
        }
        // ---------------------------------------------------------------------
        
        // 4. Send back the updated user
        res.status(200).json(updatedAlumni);

    } catch (error) {
        console.error('Error verifying alumni:', error);
        res.status(500).json({ message: 'Error verifying alumni', error: error.message });
    }
};


/**
 * @desc    Delete an alumni profile
 * @route   DELETE /api/alumni/:id
 * @access  Private (Admin / SuperAdmin)
 */
export const deleteAlumni = async (req, res) => {
    try {
        const alumni = await Alumni.findById(req.params.id);

        if (!alumni) {
            return res.status(404).json({ message: 'Alumni not found' });
        }

        // --- SECURITY CHECK ---
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
                return res.status(403).json({ message: 'Access denied. Admins can only delete verified users.' });
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
