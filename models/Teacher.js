import mongoose from 'mongoose';

/**
 * Mongoose Schema for Faculty/Teachers.
 * Note: Shares authentication fields (email, otp, verification) with Alumni,
 * but uses specific professional fields.
 */
const teacherSchema = new mongoose.Schema({
    // --- BASIC & AUTHENTICATION FIELDS ---
    fullName: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    phoneNumber: { 
        type: String, 
        required: true 
    },
    location: {
        type: String,
        required: true
    },
    
    // 🚀 NEW FIELD ADDED: UNIQUE TEACHER/FACULTY CODE (MCAxxxxF format)
    teacherCode: {
        type: String,
        unique: true,   // IMPORTANT: Ensures no two faculty members have the same code
        sparse: true    // IMPORTANT: Allows existing users (created before this update) to exist without a code
    },
    // ------------------------------------

    // --- TEACHER/FACULTY SPECIFIC FIELDS ---
    department: { 
        type: String, 
        required: true,
        // Example: Computer Applications, Electrical Engineering
    },
    designation: { 
        type: String, 
        required: true,
        // Example: Professor, Head of Department (HOD)
    },
    
    // --- ACCOUNT STATUS FIELDS ---
    password: { 
        type: String, 
        required: false, 
        select: false, // Prevents password hash from being retrieved by default queries
    }, 
    isVerified: {
        type: Boolean,
        default: false,
    },

    // --- (*** NEW FIELD ***) ---
    // This field will store the user's permission level
    role: {
        type: String,
        enum: ['user', 'admin'], // 'superadmin' is just a logic check on the email
        default: 'user',
        required: true
    },
    // ---------------------------

    otp: {
        type: String,
    },
    otpExpires: {
        type: Date,
    },

    // --- PROFILE & DIRECTORY FIELDS (Mirroring Alumni) ---
    profilePictureUrl: { 
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

const Teacher = mongoose.model('Teacher', teacherSchema);
export default Teacher;