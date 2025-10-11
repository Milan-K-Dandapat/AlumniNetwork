// controllers/donationController.js

import Donation from '../models/Donation.js'; // Import the Donation model
import Razorpay from 'razorpay'; // Import Razorpay if you want to move the order creation here

// Initialize Razorpay (assuming key IDs are available in process.env)
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});


/**
 * @desc Saves the successful donation record to MongoDB.
 * @route POST /api/donate/save-donation
 * @access Public (Called from frontend after successful Razorpay handler)
 */
export const saveDonation = async (req, res) => {
    // The request body comes directly from the frontend's 'saveDonationToDB' function
    const { 
        donorDetails, 
        amount, 
        razorpayOrderId, 
        razorpayPaymentId, 
        razorpaySignature 
    } = req.body;

    // NOTE: In a production app, you should perform server-side signature verification 
    // here to ensure the payment data wasn't tampered with.

    try {
        // 1. Check for duplicates to prevent accidental double-saves
        const existingDonation = await Donation.findOne({ razorpayPaymentId });
        if (existingDonation) {
            return res.status(200).json({ 
                message: 'Donation already recorded.', 
                donation: existingDonation 
            });
        }
        
        // 2. Create the new donation document
        const newDonation = new Donation({
            donorDetails,
            amount,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
        });

        // 3. Save to MongoDB
        await newDonation.save();

        console.log(`✅ Donation of ₹${amount} saved for ${donorDetails.email}`);
        
        // Optional: Use socket.io to broadcast the new donation for real-time updates
        if (req.io) {
            req.io.emit('newDonation', { 
                name: donorDetails.name, 
                amount: amount,
                message: donorDetails.customMessage,
                date: new Date().toISOString()
            });
        }

        // 4. Send success response
        res.status(201).json({ 
            message: 'Donation successfully recorded.', 
            donation: newDonation 
        });

    } catch (error) {
        console.error('❌ Error saving donation to database:', error);
        // Log to database failure but payment was successful
        res.status(500).json({ 
            message: 'Payment recorded, but database save failed. Please contact support.', 
            error: error.message 
        });
    }
};


/**
 * @desc Creates a Razorpay order ID for the donation.
 * @route POST /api/donate/create-order
 * @access Public
 * * NOTE: This function is likely already in your server.js, but is included here 
 * for a complete controller structure.
 */
export const createOrder = async (req, res) => {
    const { amount } = req.body;

    if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ message: 'Please provide a valid amount.' });
    }

    const options = {
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt: `receipt_donation_${new Date().getTime()}`,
    };

    try {
        const order = await razorpay.orders.create(options);
        if (!order) {
            return res.status(500).send('Error creating Razorpay order.');
        }
        res.status(201).json(order);
    } catch (error) {
        console.error('Error creating Razorpay donation order:', error);
        res.status(500).send('Server Error');
    }
};