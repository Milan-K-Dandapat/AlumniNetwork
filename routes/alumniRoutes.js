import express from 'express';
// Import the new controller function
import { getAlumni, verifyAlumni } from '../controllers/alumniController.js'; 
// We use named imports for 'protect' and 'superAdminCheck'
import { protect, superAdminCheck } from '../middleware/auth.js'; 

const router = express.Router();

// Route 1: Get all alumni profiles (Requires authentication)
router.get('/', protect, getAlumni); 

// ⬇️ REQUIRED NEW ROUTE: Alumni Verification ⬇️
// This route verifies an alumni profile, secured by both authentication and admin checks.
router.patch(
    '/:id/verify', 
    protect, 
    superAdminCheck, // IMPORTANT: Middleware that checks if user is Super Admin
    verifyAlumni
); 

export default router;
