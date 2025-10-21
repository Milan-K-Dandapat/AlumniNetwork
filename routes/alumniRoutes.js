import express from 'express';
// Import the controller functions
import { 
    getAlumni, 
    verifyAlumni, 
    deleteAlumni 
} from '../controllers/alumniController.js';

// Import the default 'auth' middleware
// The controller will now handle the logic for superadmin vs admin
import auth from '../middleware/auth.js'; 

const router = express.Router();

/**
 * @route   GET /api/alumni
 * @desc    Get all alumni profiles
 * @access  Private (All authenticated users)
 */
router.get('/', auth, getAlumni); 

/**
 * @route   PATCH /api/alumni/:id/verify
 * @desc    Verify an alumni profile
 * @access  Private (Protected by auth, logic inside controller)
 */
// The 'auth' middleware provides req.user, and the controller handles the role check.
router.patch('/:id/verify', auth, verifyAlumni);

/**
 * @route   DELETE /api/alumni/:id
 * @desc    Delete an alumni profile
 * @access  Private (Protected by auth, logic inside controller)
 */
// The 'auth' middleware provides req.user, and the controller handles the role check.
router.delete('/:id', auth, deleteAlumni);

export default router;