import express from 'express';
import { getAlumni, verifyAlumni } from '../controllers/alumniController.js'; 
import { protect, checkSuperAdmin } from '../middleware/authMiddleware.js'; // Use structured middleware

const router = express.Router();

// @route   GET /api/alumni
// @desc    Get all alumni (Access controlled by 'protect' middleware)
router.get('/', protect, getAlumni); 

// @route   PATCH /api/alumni/:id/verify
// @desc    Verify an alumni profile (Requires Super Admin access)
router.patch('/:id/verify', protect, checkSuperAdmin, verifyAlumni);

export default router;
