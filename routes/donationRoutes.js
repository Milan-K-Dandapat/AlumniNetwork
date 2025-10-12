import express from 'express';
// ✅ FIXED IMPORT: Assuming auth.js is in the ../middleware/ directory
import protect from '../middleware/auth.js'; // Assuming auth.js exports default function
import { saveDonation, createOrder, getTotalContributions } from '../controllers/donationController.js'; 

const router = express.Router();

/**
 * @route GET /api/donate/my-total
 * @desc Fetches the total contributions made by the authenticated user for the Dashboard.
 * @access Private (Applied 'protect' middleware)
 */
// ✅ CORRECT: Applies your imported 'auth' middleware
router.get('/my-total', protect, getTotalContributions); 


/**
 * @route POST /api/donate/create-order
 * @desc Creates a new Razorpay order ID.
 * @access Public 
 */
router.post('/create-order', createOrder); 


/**
 * @route POST /api/donate/save-donation
 * @desc Saves the complete donation record to MongoDB and triggers real-time update.
 * @access Public 
 */
router.post('/save-donation', saveDonation); 


export default router;
