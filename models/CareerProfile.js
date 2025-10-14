import mongoose from 'mongoose';

// --- NEW: A nested schema to define the structure for the uploaded resume file ---
const ResumeFileSchema = new mongoose.Schema({
    name: { type: String },
    type: { type: String },
    size: { type: Number },
    content: { type: String }, // This will store the Base64 string from the frontend
    uploaded: { type: Date, default: Date.now }
});

const CareerProfileSchema = new mongoose.Schema({
    // Link to the User/Alumni who owns this profile
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
    
    // --- Step 3: Skills ---
    keySkills: { 
        type: [String],
        default: [] 
    },
    
    // --- Step 4: Education ---
    highestQualification: { type: String, required: true },
    // MODIFIED: Renamed 'university' to 'institution' to match the form state
    institution: { type: String, required: true },
    startingYear: { type: String, required: true },
    // MODIFIED: 'passingYear' is no longer required to match the form logic
    passingYear: { type: String }, 
    cgpa: { type: String },

    // --- Step 5: Preferences ---
    preferredLocations: { 
        type: [String], 
        validate: [v => v.length > 0, 'At least one preferred location is required.'],
    },
    // REMOVED: 'preferredSalary' field is no longer in the form

    // --- Step 6: Resume ---
    resumeHeadline: { type: String, required: true },
    // MODIFIED: Replaced old fields with a single object to store the file data
    resumeFile: {
        type: ResumeFileSchema,
        default: null
    },

}, { timestamps: true });

export default mongoose.model('CareerProfile', CareerProfileSchema);