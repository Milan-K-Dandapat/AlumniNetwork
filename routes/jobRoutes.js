import express from 'express';
import { createJobPost, getAllJobPosts } from '../controllers/jobController.js';
import auth from '../middleware/auth.js'; 

const router = express.Router();

// Route to fetch all job posts (Requires Authentication)
router.route('/').get(auth, getAllJobPosts);

// Route to create a new job post (Requires Authentication)
router.route('/').post(auth, createJobPost);

export default router;
