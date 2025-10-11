// routes/careerProfileRoutes.js
import express from 'express';
import { saveCareerProfile } from '../controllers/careerProfileController.js';
// Import your authentication middleware here (e.g., protect)
// import { protect } from '../middleware/authMiddleware.js'; 

const router = express.Router();

// The frontend calls this endpoint with the completed profile data
// NOTE: Assuming you apply a middleware named 'protect' to ensure the user is logged in
// router.post('/save-career', protect, saveCareerProfile);
router.post('/save-career', saveCareerProfile); 

export default router;