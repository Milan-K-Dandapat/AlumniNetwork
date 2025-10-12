import Donation from '../models/Donation.js';
import Razorpay from 'razorpay';
import mongoose from 'mongoose'; // <-- ADDED: Needed for casting ID

// Initialize Razorpay... (existing logic)
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});


/**
 * @desc Saves the successful donation record to MongoDB and emits the new total amount via WebSocket.
 * @route POST /api/donate/save-donation
 * @access Private/Public (Must be protected if user ID is expected from token)
 */
export const saveDonation = async (req, res) => {
    // ... (Existing saveDonation logic remains unchanged, as it is correct) ...
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
            // Saving the userId as an ObjectId (if the schema defines it as such)
            userId: userId, 
            paymentStatus: 'success'
        });

        await newDonation.save();

        console.log(`✅ Donation of ₹${amount} saved for ${donorDetails.email} (User ID: ${userId || 'N/A'})`);
        
        // 4. --- CRITICAL: CALCULATE NEW TOTAL AND EMIT SOCKET EVENT ---
        if (req.io && userId) { 
            // Aggregation runs fine as long as the ID is saved correctly.
            const totalResult = await Donation.aggregate([ 
                { $match: { userId: userId, paymentStatus: 'success' } },
                { $group: { _id: '$userId', totalAmount: { $sum: '$amount' } } }
            ]);

            const newTotalAmount = totalResult.length > 0 ? totalResult[0].totalAmount : 0;

            req.io.emit(`contributionUpdated:${userId}`, newTotalAmount);
            console.log(`--- Socket.IO: Emitted contributionUpdated:${userId} with total: ${newTotalAmount} ---`);
        }
        // --------------------------------------------------------------------

        res.status(201).json({ message: 'Donation successfully recorded.', donation: newDonation });

    } catch (error) {
        console.error('❌ Error saving donation to database:', error);
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
 */
export const createOrder = async (req, res) => {
    // ... (Existing createOrder logic remains unchanged) ...
};

/**
 * @desc Calculates the total successful contribution amount for the authenticated user.
 * @route GET /api/donate/my-total
 * @access Private (Requires protect middleware)
 */
export const getTotalContributions = async (req, res) => {
    // Requires authentication middleware to attach the user ID (req.user._id)
    // 🛑 CRITICAL FIX: Cast the string ID from the token into an ObjectId 
    // for correct aggregation matching.
    const userId = req.user._id; 
    
    // Safety check to ensure the ID is valid before casting
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid User ID provided in token.' });
    }
    
    const userObjectId = new mongoose.Types.ObjectId(userId);

    try {
        const totalResult = await Donation.aggregate([
            { $match: { userId: userObjectId, paymentStatus: 'success' } }, // <-- Use the Object ID for matching
            { $group: { _id: '$userId', totalAmount: { $sum: '$amount' } } }
        ]);

        const totalAmount = totalResult.length > 0 ? totalResult[0].totalAmount : 0;
        
        res.json({ totalAmount: totalAmount });

    } catch (error) {
        console.error('Error fetching total contributions:', error);
        res.status(500).json({ message: 'Server Error: Could not retrieve contribution total.' });
    }
};
