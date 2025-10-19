import express from 'express';
import { getTeachers } from '../controllers/teacherController.js'; // Assuming you named the controller file teacherController.js
// FIX: Import the 'protect' function and alias it as 'auth' to maintain compatibility
import { protect as auth } from '../middleware/auth.js'; 

const router = express.Router();

/**
 * @route   GET /api/teachers
 * @desc    Get all verified teacher/faculty profiles for the directory
 * @access  Private (Requires JWT Token)
 */
router.get('/', auth, getTeachers); // Protection added: Requires valid authentication token

export default router;
