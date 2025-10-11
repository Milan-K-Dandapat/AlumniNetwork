const mongoose = require('mongoose');

const DonorDetailsSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    customMessage: { type: String },
}, { _id: false }); // We don't need a separate ID for this embedded document

const DonationSchema = new mongoose.Schema({
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
        unique: true, // Order IDs should be unique
    },
    razorpayPaymentId: {
        type: String,
        required: true,
        unique: true, // Payment IDs should be unique
    },
    razorpaySignature: {
        type: String,
        required: true,
    },
    // Status and Timestamp
    status: {
        type: String,
        enum: ['successful', 'failed', 'pending'],
        default: 'successful', // We only save successful payments, but good practice to include
    },
    paidAt: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

module.exports = mongoose.model('Donation', DonationSchema);