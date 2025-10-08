import mongoose from 'mongoose';

const alumniSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true },
    batch: { type: Number, required: true },
    company: { type: String },
    position: { type: String },
    password: { 
        type: String, 
        required: false, 
        select: false, 
    }, 
    isVerified: {
        type: Boolean,
        default: false,
    },
    otp: {
        type: String,
    },
    otpExpires: {
        type: Date,
    },

    // --- NEW PROFILE & DASHBOARD FIELDS ---
    profilePictureUrl: { // <-- 🚨 NEW FIELD ADDED HERE 🚨
        type: String,
        default: ''
    },
    achievements: { 
        type: String, 
        default: 'No achievements listed yet.' 
    },
    portfolioUrl: { 
        type: String,
        default: ''
    },
    linkedinUrl: { 
        type: String,
        default: ''
    },
    achievementPhotos: {
        type: [String], // An array of strings (image URLs)
        default: []
    }
    
}, { timestamps: true });

const Alumni = mongoose.model('Alumni', alumniSchema);
export default Alumni;
