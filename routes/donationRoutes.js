import express from 'express';
// ✅ CRITICAL FIX: Changed from default import (import protect from ...) to named import ({ protect })
// This resolves the "does not provide an export named 'default'" SyntaxError.
import { protect } from '../middleware/auth.js'; 
import { saveDonation, createOrder, getTotalContributions } from '../controllers/donationController.js'; 

const router = express.Router();

/**
 * @route GET /api/donate/my-total
 * @desc Fetches the total contributions made by the authenticated user for the Dashboard.
 * @access Private (Applied 'protect' middleware)
 */
// ✅ CORRECT: Applies your imported 'protect' middleware
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
 * @access PRIVATE 
 */
// 🛑 Correctly applies 'protect' to ensure only authenticated users can save a donation.
router.post('/save-donation', protect, saveDonation); 


export default router;
