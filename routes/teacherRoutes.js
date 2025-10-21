import express from 'express';
// --- UPDATED ---
// Import the new controller functions
import { 
    getTeachers,
    verifyTeacher, // Add this
    deleteTeacher  // Add this
} from '../controllers/teacherController.js'; 

// --- UPDATED ---
// Import both 'auth' (default) and 'isSuperAdmin' (named)
import auth, { isSuperAdmin } from '../middleware/auth.js'; 

const router = express.Router();

/**
 * @route   GET /api/teachers
 * @desc    Get all verified teacher/faculty profiles for the directory
 * @access  Private (Requires JWT Token)
 */
// This route is for all authenticated users
router.get('/', auth, getTeachers); 

// --- NEW ---
/**
 * @route   PATCH /api/teachers/:id/verify
 * @desc    Verify a teacher profile (Super Admin only)
 * @access  Private/SuperAdmin
 */
// This route is only for super admin
router.patch('/:id/verify', auth, isSuperAdmin, verifyTeacher);

// --- NEW ---
/**
 * @route   DELETE /api/teachers/:id
 * @desc    Delete a teacher profile (Super Admin only)
 * @access  Private/SuperAdmin
 */
// This route is also only for super admin
router.delete('/:id', auth, isSuperAdmin, deleteTeacher);

export default router;