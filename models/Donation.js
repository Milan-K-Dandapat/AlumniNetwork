import mongoose from 'mongoose';

const DonorDetailsSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    customMessage: { type: String },
}, { _id: false });

const DonationSchema = new mongoose.Schema({
    // --- CRITICAL FIELD (For linking to Dashboard) ---
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Alumni', 
        required: false, 
    },
    // -------------------------------------------------

    // Store the details collected from the form
    donorDetails: {
        type: DonorDetailsSchema,
        required: true,
    },
    // Payment details
    amount: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        default: 'INR',
    },
    // Razorpay transaction identifiers
    razorpayOrderId: {
        type: String,
        required: true,
        unique: true,
    },
    razorpayPaymentId: {
        type: String,
        required: true,
        unique: true,
    },
    razorpaySignature: {
        type: String,
        required: true,
    },
    // Status and Timestamp
    status: {
        type: String,
        // Use 'successful' for consistency with the controller's logic and queries
        enum: ['successful', 'failed', 'pending'], 
        default: 'successful',
    },
    paidAt: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

// 2. Use ES Module default export
export default mongoose.model('Donation', DonationSchema);