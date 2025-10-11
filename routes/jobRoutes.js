// routes/jobRoutes.js

import express from 'express';
import { getAllJobs, postJob } from '../controllers/jobController.js';
// Import your authentication middleware (e.g., protect)
// import { protect } from '../middleware/authMiddleware.js'; 

const router = express.Router();

// Public route to fetch all jobs
router.get('/get-all', getAllJobs); 

// Private route to post a new job (uncomment 'protect' when ready)
// router.post('/post', protect, postJob);
router.post('/post', postJob); 

export default router;