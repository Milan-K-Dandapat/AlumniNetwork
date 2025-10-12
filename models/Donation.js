import mongoose from 'mongoose';

const DonorDetailsSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    customMessage: { type: String },
}, { _id: false });

const DonationSchema = new mongoose.Schema({
    // --- CRITICAL FIX: ADDED USER ID FIELD ---
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        // Assuming your main user collection is 'Alumni' or 'User'
        ref: 'Alumni', 
        required: false, // Set to false to accommodate anonymous payments if needed
    },
    // ------------------------------------------

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