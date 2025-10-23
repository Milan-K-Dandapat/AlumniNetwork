import mongoose from 'mongoose';

const CareerProfileSchema = new mongoose.Schema({
    // 1. PRIMARY UNIQUE KEY: Links this profile directly to the authenticated user's ID
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        // The ref should ideally cover both Alumni and Teacher models if they can create profiles.
        // Keeping 'Alumni' here assumes your main users are alumni/students.
        // Consider changing ref if Teachers also need profiles linked this way,
        // or removing ref if the link is purely by ID without population needs.
        ref: 'Alumni',
        required: [true, 'User ID linkage is required.'], // Added custom message
        unique: true, // Crucial for enforcing one profile per user
        index: true, // Add index for faster lookups by userId
    },

    // ⭐ CRITICAL CHANGE 1: Enforce immutability and uniqueness on personalEmail ⭐
    // This email will be fetched from the primary user account in the controller and set once.
    personalEmail: {
        type: String,
        required: [true, 'Primary personal email is required.'],
        unique: true,   // Ensures no two profiles share the same primary email
        immutable: true, // Prevents updates to this field after the document is created
        trim: true,      // Automatically remove leading/trailing whitespace
        lowercase: true, // Store email in lowercase for consistency
        match: [/.+\@.+\..+/, 'Please fill a valid email address'], // Basic email format validation
    },

    // --- Step 1: User Type ---
    userType: {
        type: String,
        enum: {
            values: ['student', 'working'],
            message: '{VALUE} is not a supported user type.' // Custom enum message
        },
        required: [true, 'User type (student or working) is required.'],
    },
    currentCity: {
        type: String,
        required: [true, 'Current city is required.'],
        trim: true,
    },

    // --- Step 2 (Working Professionals Specific) ---
    isCurrentlyEmployed: { type: Boolean }, // Consider adding required based on userType if possible via validation
    totalWorkExperience: { type: String, trim: true },
    currentJobTitle: { type: String, trim: true },
    currentCompanyName: { type: String, trim: true },
    currentJobDuration: { type: String, trim: true },
    currentAnnualSalary: { type: String, trim: true },
    currentIndustry: { type: String, trim: true },
    lastJobTitle: { type: String, trim: true },
    lastCompanyName: { type: String, trim: true },

    // --- Professional Contact (Editable) ---
    professionalEmail: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/.+\@.+\..+/, 'Please fill a valid professional email address'], // Optional field, but validate if provided
    },

    // --- Step 3: Skills ---
    keySkills: {
        type: [String],
        default: [],
        // Optionally add validation for array elements if needed
        validate: {
           validator: function(arr) {
               return arr.every(skill => typeof skill === 'string' && skill.trim().length > 0);
           },
           message: 'All key skills must be non-empty strings.'
        }
    },

    // --- Step 4: Education ---
    highestQualification: { type: String, required: [true, 'Highest qualification is required.'], trim: true },
    institution: { type: String, required: [true, 'Institution name is required.'], trim: true },
    startingYear: { type: String, required: [true, 'Starting year is required.'], trim: true },
    passingYear: { type: String, trim: true }, // Optional
    cgpa: { type: String, trim: true }, // Optional

    // --- Step 5: Preferences ---
    preferredLocations: {
        type: [String],
        // Updated validation for non-empty array
        validate: {
           validator: function(arr) {
              return Array.isArray(arr) && arr.length > 0 && arr.every(loc => typeof loc === 'string' && loc.trim().length > 0);
           },
           message: 'At least one valid preferred location is required.'
       },
       // Required: true, // Can also enforce requirement here
    },

    // --- Step 6: Resume (File Path Storage) ---
    resumeHeadline: {
        type: String,
        required: [true, 'Resume headline is required.'],
        trim: true,
        maxlength: [200, 'Resume headline cannot exceed 200 characters.'] // Example length limit
    },

    // Stores the identifier (e.g., path, URL, or 'upload_later') for the resume
    resumePath: {
        type: String,
        trim: true,
        default: null,
    },

    // Stores the original filename for user reference
    resumeFilename: {
        type: String,
        trim: true,
        default: null,
    },

    // Timestamp for when the resume file was last successfully uploaded/updated
    resumeUploadedAt: {
        type: Date,
        default: null,
    }

}, {
    // Adds createdAt and updatedAt timestamps automatically
    timestamps: true
});

// Add index on personalEmail for faster lookups and unique constraint enforcement
CareerProfileSchema.index({ personalEmail: 1 });

export default mongoose.model('CareerProfile', CareerProfileSchema);