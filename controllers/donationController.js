import Donation from '../models/Donation.js'; // Import the Donation model
import Razorpay from 'razorpay'; // Import Razorpay if you want to move the order creation here

// Initialize Razorpay (assuming key IDs are available in process.env)
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
    // The request body comes directly from the frontend's 'saveDonationToDB' function
    const { 
        donorDetails, 
        amount, 
        razorpayOrderId, 
        razorpayPaymentId, 
        razorpaySignature 
    } = req.body;

    // 🛑 CRITICAL FIX: Determine userId using the most reliable source
    // Since this endpoint MUST be called by an authenticated user for dashboard linking,
    // we prioritize the ID from the Auth Token (req.user._id).
    let userId = req.user && req.user._id ? req.user._id : null; 
    
    // Fallback: If auth token wasn't fully processed, use the ID passed from frontend
    if (!userId && donorDetails.userId) { 
         userId = donorDetails.userId; 
    }
    
    // Safety Check: If no user ID is found after all checks, we cannot link to the dashboard.
    if (!userId) {
        console.warn('Donation received but NO reliable user ID found. Saving as unlinked (anonymous).');
    }


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
            userId: userId, // Save the determined userId
            paymentStatus: 'success' // Explicitly set status
        });

        // 3. Save to MongoDB
        await newDonation.save();

        console.log(`✅ Donation of ₹${amount} saved for ${donorDetails.email} (User ID: ${userId || 'N/A'})`);
        
        // 4. --- CRITICAL: CALCULATE NEW TOTAL AND EMIT SOCKET EVENT ---
        if (req.io && userId) { // Only aggregate and emit if we know the user ID
            // Aggregate the total contributions for this specific user
            const totalResult = await Donation.aggregate([ 
                { $match: { userId: userId, paymentStatus: 'success' } },
                { $group: { _id: '$userId', totalAmount: { $sum: '$amount' } } }
            ]);

            // Extract the calculated total, default to 0 if no results found
            const newTotalAmount = totalResult.length > 0 ? totalResult[0].totalAmount : 0;

            // Emit the personalized event to the user's dashboard
            req.io.emit(`contributionUpdated:${userId}`, newTotalAmount);
            console.log(`--- Socket.IO: Emitted contributionUpdated:${userId} with total: ${newTotalAmount} ---`);
        }
        // --------------------------------------------------------------------

        // 5. Send success response
        res.status(201).json({ 
            message: 'Donation successfully recorded.', 
            donation: newDonation 
        });

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

/**
 * @desc Calculates the total successful contribution amount for the authenticated user.
 * @route GET /api/donate/my-total
 * @access Private (Requires protect middleware)
 */
export const getTotalContributions = async (req, res) => {
    // Requires authentication middleware to attach the user ID (req.user._id)
    const userId = req.user._id; 

    try {
        const totalResult = await Donation.aggregate([
            { $match: { userId: userId, paymentStatus: 'success' } },
            { $group: { _id: '$userId', totalAmount: { $sum: '$amount' } } }
        ]);

        const totalAmount = totalResult.length > 0 ? totalResult[0].totalAmount : 0;
        
        res.json({ totalAmount: totalAmount });

    } catch (error) {
        console.error('Error fetching total contributions:', error);
        res.status(500).json({ message: 'Server Error: Could not retrieve contribution total.' });
    }
};

