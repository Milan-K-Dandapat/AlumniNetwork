import express from 'express';
// ⭐ UPDATED: Import updateJobPost and deleteJobPost from the controller
import { createJobPost, getAllJobPosts, updateJobPost, deleteJobPost } from '../controllers/jobController.js'; 
import auth from '../middleware/auth.js'; 

const router = express.Router();

// Route to fetch all job posts (Requires Authentication) and create new posts
// Consolidating '/' routes for clean routing
router.route('/')
    .get(auth, getAllJobPosts)
    .post(auth, createJobPost);

// ⭐ NEW ROUTE: To handle updates and deletions for a specific job/project by ID
router.route('/:id')
    .put(auth, updateJobPost)   // Handles editing a job/project
    .delete(auth, deleteJobPost); // Handles deleting a job/project

export default router;