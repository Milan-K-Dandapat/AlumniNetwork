// routes/careerProfileRoutes.js

import express from 'express';
import { saveCareerProfile } from '../controllers/careerProfileController.js';

// Import your existing 'auth' middleware
import auth from '../middleware/auth.js'; 

const router = express.Router();

// This route will handle POST requests to '/api/career-profile'
// It first runs the 'auth' middleware, then passes the request to 'saveCareerProfile'
router.route('/').post(auth, saveCareerProfile);

export default router;