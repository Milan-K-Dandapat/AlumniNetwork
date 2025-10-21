import express from 'express';
// Import the controller functions
import { 
    getTeachers,
    verifyTeacher, // Add this
    deleteTeacher  // Add this
} from '../controllers/teacherController.js'; 

// --- UPDATED ---
// We only need the default 'auth' middleware.
// The controller will handle the logic for superadmin vs admin.
import auth from '../middleware/auth.js'; 

const router = express.Router();

/**
 * @route   GET /api/teachers
 * @desc    Get all teacher profiles
 * @access  Private (All authenticated users)
 */
// This route is for all authenticated users
router.get('/', auth, getTeachers); 

/**
 * @route   PATCH /api/teachers/:id/verify
 * @desc    Verify a teacher profile
 * @access  Private (Protected by auth, logic inside controller)
 */
// The 'auth' middleware provides req.user, and the controller handles the role check.
router.patch('/:id/verify', auth, verifyTeacher);

/**
 * @route   DELETE /api/teachers/:id
 * @desc    Delete a teacher profile
 * @access  Private (Protected by auth, logic inside controller)
 */
// The 'auth' middleware provides req.user, and the controller handles the role check.
router.delete('/:id', auth, deleteTeacher);

export default router;