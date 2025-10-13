import Donation from '../models/Donation.js';
import Razorpay from 'razorpay';
import mongoose from 'mongoose'; 

// --- RAZORPAY CONFIGURATION (Kept as is) ---
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

let razorpay;
if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
        key_id: RAZORPAY_KEY_ID,
        key_secret: RAZORPAY_KEY_SECRET,
    });
} else {
    razorpay = { 
        orders: { create: async () => { 
            throw new Error("Razorpay not configured on server."); 
        }} 
    };
    console.warn("⚠️ RAZORPAY NOT INITIALIZED in donationController: Missing ENV variables.");
}

// ------------------------------------------------------------------

/**
 * @desc Saves the successful donation record to MongoDB and emits the new total amount via WebSocket.
 * @route POST /api/donate/save-donation
 * @access Private (via 'protect' middleware)
 */
export const saveDonation = async (req, res) => {
    const { 
        donorDetails, 
        amount, 
        razorpayOrderId, 
        razorpayPaymentId, 
        razorpaySignature 
    } = req.body;

    // 1. Get User ID from the token (provided by the 'protect' middleware)
    const userId = req.user._id; 
    
    // 2. Convert the userId to a valid Mongoose ObjectId for database operations
    let userObjectId = null;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        userObjectId = new mongoose.Types.ObjectId(userId);
    }
    
    if (!userObjectId) {
        return res.status(401).json({ message: 'User not authenticated or ID invalid for donation record.' });
    }

    try {
        const existingDonation = await Donation.findOne({ razorpayPaymentId });
        if (existingDonation) {
            return res.status(200).json({ message: 'Donation already recorded.', donation: existingDonation });
        }
        
        // 3. Save the new donation record
        const newDonation = new Donation({
            donorDetails,
            amount,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            userId: userObjectId,
            status: 'successful'
        });

        await newDonation.save();

        console.log(`✅ Donation of ₹${amount} saved for ${donorDetails.email}.`);
        
        // 4. CORE REAL-TIME FIX: Calculate new total and emit socket event
        if (req.io) { 
            const totalResult = await Donation.aggregate([ 
                // 1. Match
                { $match: { userId: userObjectId, status: 'successful' } },
                
                // 🛑 CORRECTED FIX: Use $addFields to ensure the field is numeric (Double) 
                // This is the most reliable way to handle stored string/ambiguous numeric types.
                { $addFields: { numericAmount: { $toDouble: "$amount" } } },
                
                // 2. Group and Sum the *new* numeric field
                { $group: { _id: '$userId', totalAmount: { $sum: '$numericAmount' } } }
            ]);

            const newTotalAmount = totalResult.length > 0 ? totalResult[0].totalAmount : 0;
            
            const userIdString = userObjectId.toString(); 

            // Emit the event the DashboardPage is listening for
            req.io.emit(`contributionUpdated:${userIdString}`, newTotalAmount);
            console.log(`--- Socket.IO: Emitted contributionUpdated:${userIdString} with total: ${newTotalAmount} ---`);
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
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ totalAmount: 0, message: 'Invalid User ID provided in token.' });
    }
    
    const userObjectId = new mongoose.Types.ObjectId(userId);

    try {
        const totalResult = await Donation.aggregate([
            // 1. Match
            { $match: { userId: userObjectId, status: 'successful' } },
            
            // 🛑 CORRECTED FIX: Use $addFields to ensure the field is numeric (Double) 
            { $addFields: { numericAmount: { $toDouble: "$amount" } } }, 
            
            // 2. Group and Sum the *new* numeric field
            { $group: { _id: '$userId', totalAmount: { $sum: '$numericAmount' } } }
        ]);

        const totalAmount = totalResult.length > 0 ? totalResult[0].totalAmount : 0;
        
        // Return the amount. The frontend will handle formatting to fixed(2)
        res.json({ totalAmount: totalAmount });

    } catch (error) {
        console.error('Error fetching total contributions:', error);
        res.status(500).json({ message: 'Server Error: Could not retrieve contribution total.' });
    }
};