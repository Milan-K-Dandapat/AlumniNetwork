import express from 'express';
// ✅ UPDATE: Import the new verification controller function
import { getTeachers, verifyTeacher } from '../controllers/teacherController.js'; 
// ✅ UPDATE: Use named exports for the middleware (protect and superAdminCheck)
import { protect, superAdminCheck } from '../middleware/auth.js'; 

const router = express.Router();

/**
 * @route   GET /api/teachers
 * @desc    Get all teacher/faculty profiles for the directory
 * @access  Private (Requires JWT Token)
 */
// ✅ UPDATE: Use 'protect' instead of 'auth' for consistency
router.get('/', protect, getTeachers); 

/**
 * @route   PATCH /api/teachers/:id/verify
 * @desc    Super Admin verifies a teacher profile
 * @access  Private (Super Admin Only)
 */
// ⬇️ REQUIRED NEW ROUTE ⬇️
router.patch(
    '/:id/verify', 
    protect, 
    superAdminCheck, // Ensures only milankumar7770@gmail.com can verify
    verifyTeacher
); 

export default router;
