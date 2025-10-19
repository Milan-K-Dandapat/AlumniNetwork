import express from 'express';
// Import the new controller function
import { getAlumni, verifyAlumni } from '../controllers/alumniController.js'; 
// We will assume these are the correct imports from your middleware folder
import { protect, superAdminCheck } from '../middleware/auth.js'; 

const router = express.Router();

// Route 1: Get all alumni (Protected route)
// The actual filtering (isVerified: true) is done inside getAlumni controller now.
router.get('/', protect, getAlumni); 

// ⬇️ REQUIRED NEW ROUTE: Alumni Verification ⬇️
// This route is protected (user must be logged in) 
// and only accessible by the Super Admin (milankumar7770@gmail.com).
router.patch(
    '/:id/verify', 
    protect, 
    superAdminCheck, // IMPORTANT: Middleware that checks if user is Super Admin
    verifyAlumni
); 

export default router;