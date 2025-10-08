// server/models/RegistrationPayment.js

import mongoose from 'mongoose';

const registrationPaymentSchema = new mongoose.Schema({
    // --- Event Details (from Registration Schema) ---
    eventId: { type: String, required: true, index: true }, // Added index
    eventTitle: { type: String }, // Added
    
    // --- Registrant Details ---
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    state: { type: String }, // Added (was missing required: true)
    district: { type: String, required: true },
    batch: { type: String, required: true },
    gender: { type: String }, // Added
    designation: { type: String }, // Added

    // --- Booking Details ---
    guestCount: { type: Number, default: 0 },
    tShirtCount: { type: Number, default: 0 },
    tShirtSize: { type: String }, // Added
    vegCount: { type: Number, default: 0 }, // Added
    nonVegCount: { type: Number, default: 0 }, // Added
    donation: { type: Number, default: 0 },

    // --- Financials & Timestamps (from Registration Schema) ---
    amount: { type: Number, required: true },
    baseCostApplied: { type: Number }, // Added
    guestCostApplied: { type: Number }, // Added
    tShirtPriceApplied: { type: Number }, // Added
    
    // Payment specific fields (Original fields retained)
    razorpay_order_id: { type: String, required: true },
    razorpay_payment_id: { type: String },
    razorpay_signature: { type: String },
    
    paymentStatus: {
        type: String,
        enum: ['created', 'success', 'failed'],
        default: 'created',
    },
}, { timestamps: true }); // Original option retained

// 2. Change this line to use export default
const RegistrationPayment = mongoose.model('RegistrationPayment', registrationPaymentSchema);

export default RegistrationPayment;