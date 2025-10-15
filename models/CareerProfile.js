import mongoose from 'mongoose';

const CareerProfileSchema = new mongoose.Schema({
    // Link to the User/Alumni who owns this profile (references the Alumni model)
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Alumni', 
        required: true,
        unique: true, 
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

    // --- ⭐ NEW: CONTACT INFORMATION ---
    // For working professionals
    professionalEmail: { 
        type: String,
    },
    // For ALL users (working professionals AND students)
    personalEmail: {
        type: String,
        required: true,
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
    cgpa: { type: String }, // Now optional

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