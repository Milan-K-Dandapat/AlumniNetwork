import express from 'express';
import { getAlumni } from '../controllers/alumniController.js';
// import { protect } from '../middleware/authMiddleware.js'; // Recommended for security

const router = express.Router();

// The direct 'router.post('/register', ...)' line MUST BE REMOVED.

// Example: Protect this route so only authenticated users can view it
// router.get('/', protect, getAlumni); 

router.get('/', getAlumni); 

export default router;