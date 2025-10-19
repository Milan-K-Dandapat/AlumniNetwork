import express from 'express';
// ✅ FIX APPLIED HERE: Changed default import to named import '{ protect }'
import { protect } from '../middleware/auth.js'; 
import { saveDonation, createOrder, getTotalContributions } from '../controllers/donationController.js'; 

const router = express.Router();

/**
 * @route GET /api/donate/my-total
 * @desc Fetches the total contributions made by the authenticated user for the Dashboard.
 * @access Private (Applied 'protect' middleware)
 */
// ✅ CORRECT: Applies the named export 'protect' middleware
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
 * @access PRIVATE (CRITICAL FIX APPLIED HERE)
 */
// ✅ CORRECT: Ensures the user is authenticated before saving the donation
router.post('/save-donation', protect, saveDonation); 


export default router;
