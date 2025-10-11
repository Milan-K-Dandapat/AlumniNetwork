import mongoose from 'mongoose';

const CareerProfileSchema = new mongoose.Schema({
    // Link to the User/Alumni who owns this profile
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Alumni', // Assuming you want to link it to the Alumni collection
        required: true,
        unique: true, // Each user can only have one career profile
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
    isCurrentlyEmployed: { 
        type: Boolean,
        // Required only if userType is 'working' (validation handled by the frontend form logic)
    }, 
    totalWorkExperience: { 
        type: String 
    },
    currentJobTitle: { type: String },
    currentCompanyName: { type: String },
    currentJobDuration: { type: String },
    currentAnnualSalary: { type: String },
    currentIndustry: { type: String },
    lastJobTitle: { type: String },
    lastCompanyName: { type: String },
    
    // --- Step 3: Skills ---
    keySkills: { 
        type: [String], // Array of strings 
        default: [] 
    },
    
    // --- Step 4: Education ---
    highestQualification: { type: String, required: true },
    startingYear: { type: String, required: true },
    passingYear: { type: String, required: true },
    cgpa: { 
        type: String, // Stored as string to handle '85%' or '8.5'
        // Validation for mandatory status based on userType is handled in the frontend
    },
    university: { 
        type: String, 
        default: 'INDIRA GANDHI INSTITUTE OF TECHNOLOGY' 
    },

    // --- Step 5: Preferences ---
    preferredLocations: { 
        type: [String], 
        validate: [v => v.length > 0, 'At least one preferred location is required.'],
    },
    preferredSalary: { type: String },

    // --- Step 6: Resume ---
    resumeHeadline: { type: String, required: true },
    resumeFileUrl: { 
        type: String,
        // Will be null if uploadLater is true
    },
    uploadLater: { 
        type: Boolean,
        default: false 
    },

}, { timestamps: true });

export default mongoose.model('CareerProfile', CareerProfileSchema);