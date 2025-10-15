import mongoose from 'mongoose';

// --- NEW: Simplified Schema to store file *location* and *metadata* ---
// NOTE: We don't need a separate schema, we can put these fields directly in the main schema
// unless you have many files. Since it's only one resume, direct fields are simpler.

const CareerProfileSchema = new mongoose.Schema({
    // Link to the User/Alumni who owns this profile
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Alumni', 
        required: true,
        unique: true, 
    },
    
    // -------------------------------------------------------------------
    // --- Step 1: User Type ---
    // -------------------------------------------------------------------
    userType: { 
        type: String, 
        enum: ['student', 'working'], 
        required: true 
    },
    currentCity: { 
        type: String, 
        required: true 
    },

    // -------------------------------------------------------------------
    // --- Step 2 (Working Professionals Specific) ---
    // -------------------------------------------------------------------
    isCurrentlyEmployed: { type: Boolean }, 
    totalWorkExperience: { type: String },
    currentJobTitle: { type: String },
    currentCompanyName: { type: String },
    currentJobDuration: { type: String },
    currentAnnualSalary: { type: String },
    currentIndustry: { type: String },
    lastJobTitle: { type: String },
    lastCompanyName: { type: String },
    
    // -------------------------------------------------------------------
    // --- Step 3: Skills ---
    // -------------------------------------------------------------------
    keySkills: { 
        type: [String],
        default: [] 
    },
    
    // -------------------------------------------------------------------
    // --- Step 4: Education ---
    // -------------------------------------------------------------------
    highestQualification: { type: String, required: true },
    institution: { type: String, required: true },
    startingYear: { type: String, required: true },
    passingYear: { type: String }, 
    cgpa: { type: String },

    // -------------------------------------------------------------------
    // --- Step 5: Preferences ---
    // -------------------------------------------------------------------
    preferredLocations: { 
        type: [String], 
        validate: [v => v.length > 0, 'At least one preferred location is required.'],
    },

    // -------------------------------------------------------------------
    // --- Step 6: Resume (CRITICAL FIX: Storing File Path) ---
    // -------------------------------------------------------------------
    resumeHeadline: { 
        type: String, 
        required: true 
    },
    
    // NEW FIELD: Stores the local path to the uploaded PDF file (provided by Multer)
    resumePath: { 
        type: String,
        default: null, // Will be 'upload_later' or the path/to/file.pdf
    },

    // OPTIONAL: Stores the filename for display purposes
    resumeFilename: {
        type: String,
        default: null,
    },

    // OPTIONAL: Stores the date/time the resume was uploaded
    resumeUploadedAt: {
        type: Date,
        default: null,
    }

}, { timestamps: true });

// CRITICAL CLEANUP: Remove the old/misconfigured sub-schema.
// This ensures that Mongoose doesn't try to save non-existent fields.
// The old 'resumeFile' object field is implicitly replaced by the new file-related fields.

export default mongoose.model('CareerProfile', CareerProfileSchema);