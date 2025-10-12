import express from 'express';
// Assuming you have a file that exports this middleware
import { protect } from '../middleware/authMiddleware.js'; 
import { saveDonation, createOrder, getTotalContributions } from '../controllers/donationController.js'; // <-- ENSURE getTotalContributions IS IMPORTED

const router = express.Router();

/**
 * @route GET /api/donate/my-total
 * @desc Fetches the total contributions made by the authenticated user for the Dashboard.
 * @access Private
 */
router.get('/my-total', protect, getTotalContributions); 


/**
 * @route POST /api/donate/create-order
 * @desc Creates a new Razorpay order ID.
 * @access Public 
 */
router.post('/create-order', createOrder); 


/**
 * @route POST /api/donate/save-donation
 * @desc Saves the complete donation record to MongoDB.
 * @access Public 
 */
router.post('/save-donation', saveDonation); 


export default router;