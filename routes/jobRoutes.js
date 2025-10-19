import express from 'express';
// ⭐ FIX APPLIED HERE: Use named import { protect } instead of default import auth
import { createJobPost, getAllJobPosts, updateJobPost, deleteJobPost } from '../controllers/jobController.js'; 
import { protect } from '../middleware/auth.js'; 

const router = express.Router();

// Route to fetch all job posts (Requires Authentication) and create new posts
// Consolidating '/' routes for clean routing
router.route('/')
    .get(protect, getAllJobPosts) // Correctly using 'protect'
    .post(protect, createJobPost); // Correctly using 'protect'

// ⭐ NEW ROUTE: To handle updates and deletions for a specific job/project by ID
router.route('/:id')
    .put(protect, updateJobPost)   // Correctly using 'protect'
    .delete(protect, deleteJobPost); // Correctly using 'protect'

export default router;
