import express from 'express';
// --- UPDATED ---
// Import the new controller functions we'll be using
import { 
    getAlumni, 
    verifyAlumni, // Assuming this is your verify function
    deleteAlumni 
} from '../controllers/alumniController.js';

// --- UPDATED ---
// Import both 'auth' (default) and 'isSuperAdmin' (named)
import auth, { isSuperAdmin } from '../middleware/auth.js'; 

const router = express.Router();

// This route is for all authenticated users
router.get('/', auth, getAlumni); 

// --- NEW ---
// This route is only for super admin (auth + isSuperAdmin)
router.patch('/:id/verify', auth, isSuperAdmin, verifyAlumni);

// --- NEW ---
// This route is also only for super admin (auth + isSuperAdmin)
router.delete('/:id', auth, isSuperAdmin, deleteAlumni);

export default router;