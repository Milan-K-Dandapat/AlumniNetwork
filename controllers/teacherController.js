import Teacher from '../models/Teacher.js';
// We don't need to import 'auth' here; the routes file handles that.

const SUPER_ADMIN_EMAIL = 'milankumar7770@gmail.com';

/**
 * @desc    Get all teacher profiles (both verified and unverified)
 * @route   GET /api/teachers
 * @access  Private (Requires auth)
 */
export const getTeachers = async (req, res) => {
    try {
        // This query is correct. It finds all teachers ({})
        // so that admins can see unverified users.
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
        // --- NEW SECURITY CHECK ---
        // Get user details from the auth middleware
        const userRole = req.user.role;
        const isSuperAdmin = req.user.email === SUPER_ADMIN_EMAIL;

        // Only allow 'admin' or 'superadmin' to verify
        if (userRole !== 'admin' && !isSuperAdmin) {
             return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }
        // --- END SECURITY CHECK ---

        const teacher = await Teacher.findById(req.params.id);

        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        teacher.isVerified = true;
        const updatedTeacher = await teacher.save();
        
        // Send back the updated user, which your frontend code expects
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