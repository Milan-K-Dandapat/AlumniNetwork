// routes/careerProfileRoutes.js
import express from 'express';
import { saveCareerProfile } from '../controllers/careerProfileController.js';

// --- IMPORTANT: Import and enable your authentication middleware ---
// I'm assuming the file is in '../middleware/authMiddleware.js' and the function is named 'protect'.
// Please adjust the path if your file is located elsewhere.
import { protect } from '../middleware/authMiddleware.js'; 

const router = express.Router();

// This is a standard RESTful approach. 
// When this router is used in your main server file like `app.use('/api/career-profile', careerProfileRoutes)`,
// this route will correctly handle POST requests to `/api/career-profile`.
router.route('/').post(protect, saveCareerProfile);

export default router;