// server/models/RegistrationPayment.js

import mongoose from 'mongoose';

const registrationPaymentSchema = new mongoose.Schema({
    // --- Event Details (from Registration Schema) ---
    eventId: { type: String, required: true, index: true }, 
    eventTitle: { type: String }, 
    
    // --- Registrant Details ---
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    state: { type: String }, // Made optional (was missing required: true)
    district: { type: String, required: true },
    batch: { type: String, required: true },
    gender: { type: String }, 
    designation: { type: String }, 

    // --- Booking Details ---
    guestCount: { type: Number, default: 0 },
    tShirtCount: { type: Number, default: 0 },
    tShirtSize: { type: String }, 
    vegCount: { type: Number, default: 0 }, 
    nonVegCount: { type: Number, default: 0 }, 
    donation: { type: Number, default: 0 },

    // --- Financials & Cost Breakdown ---
    amount: { type: Number, required: true },
    baseCostApplied: { type: Number }, 
    guestCostApplied: { type: Number }, 
    tShirtPriceApplied: { type: Number }, 
    
    // 🛑 FIX: Payment specific fields are now optional for 'free' and 'pending' status
    razorpay_order_id: { type: String }, // <-- REQUIRED: REMOVED
    razorpay_payment_id: { type: String },
    razorpay_signature: { type: String },

    // 🛑 FIX: Custom field to hold generalized payment data (optional)
    paymentDetails: {
        orderId: { type: String },
        paymentId: { type: String },
        signature: { type: String },
    },
    
    paymentStatus: {
        type: String,
        enum: ['created', 'pending', 'success', 'failed', 'free'], // Added 'pending' and 'free'
        default: 'created',
    },
}, { timestamps: true }); 

const RegistrationPayment = mongoose.model('RegistrationPayment', registrationPaymentSchema);

export default RegistrationPayment;