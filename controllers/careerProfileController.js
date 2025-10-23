import mongoose from 'mongoose';
import CareerProfile from '../models/CareerProfile.js';
// ⭐ CRITICAL IMPORTS: Need access to the primary user models to fetch the permanent email
import Alumni from '../models/Alumni.js';
import Teacher from '../models/Teacher.js';

// --- Helper function to find the primary user in either collection ---
const findPrimaryUser = async (userId) => {
    // Check if the ID is valid before querying (optional, but good practice)
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return null; // Added mongoose validation check

    // Search Alumni collection first
    let user = await Alumni.findById(userId).select('email alumniCode').lean();
    if (user) return user;

    // Search Teacher collection if not found in Alumni
    user = await Teacher.findById(userId).select('email teacherCode').lean();
    if (user) return user;

    return null;
};

// --- SAVE/UPDATE Career Profile (POST /api/career-profile) ---
export const saveCareerProfile = async (req, res) => {
    // Get the user ID attached by the 'auth.js' middleware
    const userId = req.user?._id;

    // 1. Security check: Ensure user is authenticated
    if (!userId) {
        return res.status(401).json({ success: false, message: 'Not authorized. User ID not found.' });
    }

    // ⭐ 2. FETCH PERMANENT DATA FROM PRIMARY USER ACCOUNT
    const primaryUser = await findPrimaryUser(userId);

    if (!primaryUser || !primaryUser.email) {
        return res.status(404).json({ success: false, message: 'Primary user account not found or email is missing. Cannot create profile.' });
    }

    // --- 3. Parse the JSON String from FormData ---
    let parsedProfileData;
    try {
        if (!req.body.profileData || typeof req.body.profileData !== 'string') { // Added type check
            return res.status(400).json({ success: false, message: 'Missing or invalid career profile data in request body.' });
        }

        parsedProfileData = JSON.parse(req.body.profileData);

        // Convert the stringified arrays back to JS arrays safely
        if (parsedProfileData.keySkills && typeof parsedProfileData.keySkills === 'string') {
             try {
                 parsedProfileData.keySkills = JSON.parse(parsedProfileData.keySkills);
             } catch (e) {
                 console.error("Error parsing keySkills JSON:", e);
                 parsedProfileData.keySkills = []; // Default to empty array on error
             }
        } else if (!Array.isArray(parsedProfileData.keySkills)) {
             parsedProfileData.keySkills = []; // Ensure it's an array if not string or array
        }

        if (parsedProfileData.preferredLocations && typeof parsedProfileData.preferredLocations === 'string') {
             try {
                 parsedProfileData.preferredLocations = JSON.parse(parsedProfileData.preferredLocations);
             } catch (e) {
                 console.error("Error parsing preferredLocations JSON:", e);
                 parsedProfileData.preferredLocations = []; // Default to empty array on error
             }
        } else if (!Array.isArray(parsedProfileData.preferredLocations)) {
            parsedProfileData.preferredLocations = []; // Ensure it's an array
        }

    } catch (parseError) {
        console.error('Error parsing profileData JSON:', parseError);
        return res.status(400).json({ success: false, message: 'Invalid format for profile data.' });
    }

    // --- 4. Handle Resume File from Multer (req.file) ---
    const fileInfo = {};
    if (req.file) {
        // Multer successfully uploaded the file; save its path and metadata
        // Ensure you are saving the correct path or identifier based on your storage setup (e.g., local path, S3 URL, Cloudinary ID)
        fileInfo.resumePath = req.file.path; // Example: 'uploads/resume-16665...'
        fileInfo.resumeFilename = req.file.originalname; // Example: 'MyResume.pdf'
        fileInfo.resumeUploadedAt = new Date();
        // Clear any previous 'upload_later' flag if a file is now uploaded
        fileInfo.uploadLater = undefined;
    } else {
        // If no file was uploaded, check the 'upload later' flag from the *parsed* data
        if (parsedProfileData.uploadLater === true) { // Explicitly check for true
             fileInfo.resumePath = 'upload_later';
             // Optionally clear existing filename/date if they chose upload_later now
             fileInfo.resumeFilename = undefined;
             fileInfo.resumeUploadedAt = undefined;
        } else {
            // If no file and not uploadLater, keep existing file info (if any)
            // This prevents accidentally deleting file info on profile edits that don't include a new file
        }
    }

    // --- 5. Combine and Clean Data ---
    const dataToSave = {
        ...parsedProfileData, // Spread parsed data first
        ...fileInfo,          // Spread file info (overwrites resumePath/Filename if file uploaded/uploadLater)
        userId: userId,       // CRITICAL: Link to the authenticated user
        // ⭐ PERMANENT FIX: OVERWRITE personalEmail with the verified primary user email.
        personalEmail: primaryUser.email,
    };

    // Clean up temporary client-side flags that shouldn't be saved in DB
    delete dataToSave.resumeFile; // This was the File object, not needed now
    delete dataToSave.uploadLater; // This flag is handled by fileInfo logic

    // ***** THE ONLY CHANGE IS REMOVING THE LINE BELOW *****
    // delete dataToSave.personalEmail; // <-- REMOVED THIS LINE

    try {
        // 6. Use upsert to create or update the profile based on the unique userId
        const updatedProfile = await CareerProfile.findOneAndUpdate(
            { userId: userId }, // Query ONLY by the unique user's ID
            { $set: dataToSave }, // Use $set to update only provided fields
            {
                new: true,         // Return the updated document
                upsert: true,      // Create if it doesn't exist
                runValidators: true, // Run Mongoose schema validation
                setDefaultsOnInsert: true // Apply schema defaults on creation
            }
        ).lean(); // Use .lean() for a plain JS object result

        if (!updatedProfile) {
            // This case should theoretically not happen with upsert: true unless there's a DB issue
            return res.status(500).json({ success: false, message: 'Profile could not be created or updated due to an unexpected issue.' });
        }

        console.log(`Profile for user ${userId} saved successfully. Email: ${updatedProfile.personalEmail}`);

        // Send a successful response back to the client
        res.status(200).json({
            success: true,
            message: 'Career profile saved successfully!',
            data: updatedProfile // Send back the saved/updated profile data
        });

    } catch (error) {
        console.error('Error saving career profile:', error);

        // Handle Mongoose Validation Errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join('. ') }); // Join with period and space
        }

        // Handle the unique index error (E11000) more specifically
        if (error.code === 11000) {
            let field = Object.keys(error.keyPattern)[0];
            field = field === 'userId' ? 'user' : field; // Make message more user-friendly
            return res.status(409).json({ success: false, message: `A profile already exists for this ${field}. You can only edit your existing profile.` }); // Use 409 Conflict
        }

        // General server error
        res.status(500).json({ success: false, message: 'An unexpected server error occurred while saving the profile.' });
    }
};

// --- GET My Career Profile (GET /api/career-profile/me) ---
export const getMyCareerProfile = async (req, res) => {
    const userId = req.user?._id; // User ID from the auth middleware

    if (!userId) {
        return res.status(401).json({ success: false, message: 'Not authorized.' });
    }

    try {
        // Query remains simple and correct: find the profile linked to the logged-in user ID
        const profile = await CareerProfile.findOne({ userId: userId }).lean(); // Use lean for performance

        if (!profile) {
            // Returns 404, prompting the frontend to show the Profile Builder
            return res.status(404).json({ success: false, message: 'Career profile not found for this user.' });
        }

        // Success: send the found profile
        res.status(200).json({ success: true, data: profile });

    } catch (error) {
        console.error('Error fetching career profile:', error);
        res.status(500).json({ success: false, message: 'An unexpected server error occurred while fetching the profile.' });
    }
};