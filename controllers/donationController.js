import Donation from '../models/Donation.js';
import Razorpay from 'razorpay';
import mongoose from 'mongoose'; 

// 🛑 CRITICAL FIX: Initialize Razorpay Conditionally to Prevent Server Crash

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

let razorpay;
if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
        key_id: RAZORPAY_KEY_ID,
        key_secret: RAZORPAY_KEY_SECRET,
    });
} else {
    // Mocking object to prevent server crash during module loading
    razorpay = { 
        orders: { create: async () => { 
            throw new Error("Razorpay not configured on server."); 
        }} 
    };
    console.warn("⚠️ RAZORPAY NOT INITIALIZED in donationController: Missing ENV variables.");
}

// ... rest of the controller code remains the same ...

/**
 * @desc Saves the successful donation record to MongoDB and emits the new total amount via WebSocket.
 * @route POST /api/donate/save-donation
 * @access Private/Public (Must be protected if user ID is expected from token)
 */
export const saveDonation = async (req, res) => {
// ... (Logic remains unchanged) ...
    const { 
        donorDetails, 
        amount, 
        razorpayOrderId, 
        razorpayPaymentId, 
        razorpaySignature 
    } = req.body;

    let userId = req.user && req.user._id ? req.user._id : null; 
    
    if (!userId && donorDetails.userId) { 
         userId = donorDetails.userId; 
    }
    
    if (!userId) {
        console.warn('Donation received but NO reliable user ID found. Saving as unlinked (anonymous).');
    }

    try {
        const existingDonation = await Donation.findOne({ razorpayPaymentId });
        if (existingDonation) {
            return res.status(200).json({ message: 'Donation already recorded.', donation: existingDonation });
        }
        
        const newDonation = new Donation({
            donorDetails,
            amount,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            userId: userId, 
            paymentStatus: 'success'
        });

        await newDonation.save();

        console.log(`✅ Donation of ₹${amount} saved for ${donorDetails.email} (User ID: ${userId || 'N/A'})`);
        
        // CRITICAL: CALCULATE NEW TOTAL AND EMIT SOCKET EVENT
        if (req.io && userId) { 
            const totalResult = await Donation.aggregate([ 
                { $match: { userId: userId, paymentStatus: 'success' } },
                { $group: { _id: '$userId', totalAmount: { $sum: '$amount' } } }
            ]);

            const newTotalAmount = totalResult.length > 0 ? totalResult[0].totalAmount : 0;

            req.io.emit(`contributionUpdated:${userId}`, newTotalAmount);
            console.log(`--- Socket.IO: Emitted contributionUpdated:${userId} with total: ${newTotalAmount} ---`);
        }

        res.status(201).json({ message: 'Donation successfully recorded.', donation: newDonation });

    } catch (error) {
        console.error('❌ Error saving donation to database:', error);
        res.status(500).json({ message: 'Payment recorded, but database save failed. Please contact support.', error: error.message });
    }
};


/**
 * @desc Creates a Razorpay order ID for the donation.
 * @route POST /api/donate/create-order
 * @access Public
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
        // NOTE: This will throw the mocked error if Razorpay is not initialized
        const order = await razorpay.orders.create(options); 
        if (!order) {
            return res.status(500).send('Error creating Razorpay order.');
        }
        res.status(201).json(order);
    } catch (error) {
        console.error('Error creating Razorpay donation order:', error);
        res.status(500).send('Server Error: Failed to create payment order.');
    }
};

/**
 * @desc Calculates the total successful contribution amount for the authenticated user.
 * @route GET /api/donate/my-total
 * @access Private (Requires protect middleware)
 */
export const getTotalContributions = async (req, res) => {
    const userId = req.user._id; 
    
    // Safety check to ensure the ID is valid before casting
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ totalAmount: 0, message: 'Invalid User ID provided in token.' });
    }
    
    const userObjectId = new mongoose.Types.ObjectId(userId);

    try {
        const totalResult = await Donation.aggregate([
            { $match: { userId: userObjectId, paymentStatus: 'success' } }, 
            { $group: { _id: '$userId', totalAmount: { $sum: '$amount' } } }
        ]);

        const totalAmount = totalResult.length > 0 ? totalResult[0].totalAmount : 0;
        
        res.json({ totalAmount: totalAmount });

    } catch (error) {
        console.error('Error fetching total contributions:', error);
        res.status(500).json({ message: 'Server Error: Could not retrieve contribution total.' });
    }
};
