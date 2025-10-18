// routes/alumniRoutes.js

import express from 'express';
// 1. IMPORT THE NEW VERIFY CONTROLLER
import { getAlumni, verifyAlumni } from '../controllers/alumniController.js';
// 2. IMPORT BOTH AUTH AND THE NEW isSuperAdmin MIDDLEWARE
import auth, { isSuperAdmin } from '../middleware/auth.js'; 

const router = express.Router();

// The direct 'router.post('/register', ...)' line MUST BE REMOVED.

// 3. SECURED THE MAIN DIRECTORY ROUTE (as per your comment)
// Now, only logged-in users can view the alumni list.
router.get('/', auth, getAlumni); 

// 4. --- NEW SUPER ADMIN VERIFICATION ROUTE ---
// This route is protected by two layers:
// 1. 'auth' - Checks if a user is logged in.
// 2. 'isSuperAdmin' - Checks if the logged-in user is YOU.
// Only if both pass, it will run 'verifyAlumni'.
router.patch('/:id/verify', auth, isSuperAdmin, verifyAlumni);

export default router;