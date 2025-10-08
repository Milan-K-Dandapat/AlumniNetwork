import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema({
    eventId: { type: String, required: true, index: true },
    eventTitle: { type: String },
    
    // --- Registrant Details ---
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    state: { type: String },
    district: { type: String },
    batch: { type: String },
    gender: { type: String },
    designation: { type: String },

    // --- Booking Details ---
    guestCount: { type: Number, default: 0 },
    tShirtCount: { type: Number, default: 0 },
    tShirtSize: { type: String },
    vegCount: { type: Number, default: 0 },
    nonVegCount: { type: Number, default: 0 },
    donation: { type: Number, default: 0 },

    // --- Financials & Timestamps ---
    amount: { type: Number, required: true },
    baseCostApplied: { type: Number },
    guestCostApplied: { type: Number },
    tShirtPriceApplied: { type: Number },
    
    registrationDate: { type: Date, default: Date.now },
});

const Registration = mongoose.model('Registration', registrationSchema);

export default Registration;
