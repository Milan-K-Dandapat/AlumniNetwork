import mongoose from 'mongoose';

const CareerProfileSchema = new mongoose.Schema({
    // 1. PRIMARY UNIQUE KEY: Links this profile directly to the authenticated user's ID
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        // The ref should ideally cover both Alumni and Teacher models if they can create profiles.
        // Keeping 'Alumni' here assumes your main users are alumni/students.
        ref: 'Alumni', 
        required: true,
        unique: true, // Crucial for enforcing one profile per user
    },
    
    // ⭐ CRITICAL CHANGE 1: Enforce immutability and uniqueness on personalEmail ⭐
    // This email will be fetched from the primary user account in the controller and set once.
    personalEmail: {
        type: String,
        required: true,
        unique: true,   // Ensures no two profiles share the same email
        immutable: true, // Prevents updates to this field after the document is created
    },
    
    // --- Step 1: User Type ---
    userType: { 
        type: String, 
        enum: ['student', 'working'], 
        required: true 
    },
    currentCity: { 
        type: String, 
        required: true 
    },

    // --- Step 2 (Working Professionals Specific) ---
    isCurrentlyEmployed: { type: Boolean }, 
    totalWorkExperience: { type: String },
    currentJobTitle: { type: String },
    currentCompanyName: { type: String },
    currentJobDuration: { type: String },
    currentAnnualSalary: { type: String },
    currentIndustry: { type: String },
    lastJobTitle: { type: String },
    lastCompanyName: { type: String },

    // --- Professional Contact (Editable) ---
    professionalEmail: { 
        type: String,
    },
    
    // --- Step 3: Skills ---
    keySkills: { 
        type: [String],
        default: [] 
    },
    
    // --- Step 4: Education ---
    highestQualification: { type: String, required: true },
    institution: { type: String, required: true },
    startingYear: { type: String, required: true },
    passingYear: { type: String }, 
    cgpa: { type: String },

    // --- Step 5: Preferences ---
    preferredLocations: { 
        type: [String], 
        validate: [v => v.length > 0, 'At least one preferred location is required.'],
    },

    // --- Step 6: Resume (File Path Storage) ---
    resumeHeadline: { 
        type: String, 
        required: true 
    },
    
    // Stores the local path where Multer saves the PDF
    resumePath: { 
        type: String,
        default: null, // Will be the path or 'upload_later'
    },

    resumeFilename: {
        type: String,
        default: null,
    },

    resumeUploadedAt: {
        type: Date,
        default: null,
    }

}, { timestamps: true });

export default mongoose.model('CareerProfile', CareerProfileSchema);