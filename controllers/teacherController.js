import Teacher from '../models/Teacher.js';
// Assumes services/emailService.js is located one directory up from the controllers folder
import { sendCongratulatoryEmail } from '../services/emailService.js'; 

const SUPER_ADMIN_EMAIL = 'milankumar7770@gmail.com';

/**
 * @desc    Get all teacher profiles (both verified and unverified)
 * @route   GET /api/teachers
 * @access  Private (Requires auth)
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
 * @desc    Verify a teacher profile
 * @route   PATCH /api/teachers/:id/verify
 * @access  Private (Admin / SuperAdmin)
 */
export const verifyTeacher = async (req, res) => {
    try {
        // --- SECURITY CHECK (Ensures only Admin/SuperAdmin can execute) ---
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
        
        // 1. Check current verification status BEFORE updating
        const wasVerified = teacher.isVerified;

        // 2. Perform verification update
        teacher.isVerified = true;
        const updatedTeacher = await teacher.save();

        // 3. ⭐ EMAIL LOGIC: Send email ONLY if the teacher was NOT previously verified ⭐
        if (!wasVerified && updatedTeacher.isVerified) {
            // Call the email service asynchronously
            sendCongratulatoryEmail(updatedTeacher.email, updatedTeacher.fullName);
        }
        // -------------------------------------------------------------------------
        
        // 4. Send back the updated user
        res.status(200).json(updatedTeacher);

    } catch (error) {
        console.error('Error verifying teacher:', error);
        res.status(500).json({ message: 'Error verifying teacher', error: error.message });
    }
};


/**
 * @desc    Delete a teacher profile
 * @route   DELETE /api/teachers/:id
 * @access  Private (Admin / SuperAdmin)
 */
export const deleteTeacher = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id);

        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        // --- SECURITY CHECK ---
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
