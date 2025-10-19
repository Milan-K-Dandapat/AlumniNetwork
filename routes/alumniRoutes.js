import express from 'express';
import { getAlumni } from '../controllers/alumniController.js';
import auth from '../middleware/auth.js'; // ⭐ Import your standard auth middleware

const router = express.Router();

// The purpose of the career network is to serve alumni. 
// This route should only be accessible if the user is authenticated.

// ⭐ ACTION: Apply the 'auth' middleware to protect this route.
router.get('/', auth, getAlumni); 

export default router;