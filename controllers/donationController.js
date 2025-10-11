const Donation = require('../models/Donation');
// Assuming you have a file to require the Donation model

// Controller function to save donation record
exports.saveDonation = async (req, res) => {
    // The request body comes directly from the frontend's 'saveDonationToDB' function
    const { 
        donorDetails, 
        amount, 
        razorpayOrderId, 
        razorpayPaymentId, 
        razorpaySignature 
    } = req.body;

    // IMPORTANT: In a real-world scenario, you should perform server-side verification 
    // of the signature here using Razorpay's crypto function to ensure the payment 
    // was not tampered with. For this setup, we'll focus on saving the data.

    try {
        const newDonation = new Donation({
            donorDetails,
            amount,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            // status and paidAt will use defaults
        });

        await newDonation.save();

        console.log(`Donation of ₹${amount} saved for ${donorDetails.email}`);

        // Send a success response back to the frontend
        res.status(201).json({ 
            message: 'Donation successfully recorded.', 
            donation: newDonation 
        });

    } catch (error) {
        console.error('Error saving donation to database:', error);
        // Use a 500 status if the payment was successful but database save failed
        res.status(500).json({ 
            message: 'Payment recorded, but database save failed. Please contact support.', 
            error: error.message 
        });
    }
};