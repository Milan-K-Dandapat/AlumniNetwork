// routes/donationRoutes.js

import express from 'express';
// Import the controller functions using named imports
import { saveDonation, createOrder } from '../controllers/donationController.js'; 

const router = express.Router();

/**
 * @route POST /api/donate/create-order
 * @desc Creates a new Razorpay order ID.
 * @access Public (Called by frontend when user proceeds to pay)
 */
router.post('/create-order', createOrder); 


/**
 * @route POST /api/donate/save-donation
 * @desc Saves the complete donation record (donor details + payment IDs) to MongoDB.
 * @access Public (Called by Razorpay handler ONLY on successful payment)
 */
router.post('/save-donation', saveDonation); 


// Export the router using a default export
export default router;