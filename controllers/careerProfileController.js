import mongoose from 'mongoose'; // <-- Make sure this is present
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
    // ⭐ LOG 1 ⭐
    console.log("Fetched Primary User:", JSON.stringify(primaryUser, null, 2));


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
        fileInfo.resumePath = req.file.path;
        fileInfo.resumeFilename = req.file.originalname;
        fileInfo.resumeUploadedAt = new Date();
        fileInfo.uploadLater = undefined;
    } else {
        if (parsedProfileData.uploadLater === true) {
             fileInfo.resumePath = 'upload_later';
             fileInfo.resumeFilename = undefined;
             fileInfo.resumeUploadedAt = undefined;
        } else {
           // Keep existing file info
        }
    }

    // --- 5. Combine and Clean Data ---
    const dataToSave = {
        ...parsedProfileData,
        ...fileInfo,
        userId: userId,
        personalEmail: primaryUser.email, // Use primaryUser email
    };

    // ⭐ LOG 2 ⭐
    console.log("Data BEFORE final save:", JSON.stringify(dataToSave, null, 2));

    delete dataToSave.resumeFile;
    delete dataToSave.uploadLater;

    try {
        // 6. Use upsert to create or update the profile based on the unique userId
        const updatedProfile = await CareerProfile.findOneAndUpdate(
            { userId: userId },
            { $set: dataToSave },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        ).lean();

        // ⭐ LOG 3 ⭐
        console.log("Data AFTER save (returned by Mongoose):", JSON.stringify(updatedProfile, null, 2));


        if (!updatedProfile) {
            return res.status(500).json({ success: false, message: 'Profile could not be created or updated due to an unexpected issue.' });
        }

        console.log(`Profile for user ${userId} saved successfully.`); // Removed email log here as it's in LOG 3

        // Send a successful response back to the client
        res.status(200).json({
            success: true,
            message: 'Career profile saved successfully!',
            data: updatedProfile
        });

    } catch (error) {
        console.error('Error saving career profile:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join('. ') });
        }
        if (error.code === 11000) {
            let field = Object.keys(error.keyPattern)[0];
            field = field === 'userId' ? 'user' : field;
            return res.status(409).json({ success: false, message: `A profile already exists for this ${field}. You can only edit your existing profile.` });
        }
        res.status(500).json({ success: false, message: 'An unexpected server error occurred while saving the profile.' });
    }
};

// --- GET My Career Profile (GET /api/career-profile/me) ---
// (No changes needed in getMyCareerProfile - kept for completeness)
export const getMyCareerProfile = async (req, res) => {
    const userId = req.user?._id;

    if (!userId) {
        return res.status(401).json({ success: false, message: 'Not authorized.' });
    }

    try {
        const profile = await CareerProfile.findOne({ userId: userId }).lean();

        if (!profile) {
            return res.status(404).json({ success: false, message: 'Career profile not found for this user.' });
        }

        // ⭐ Log fetched data (optional, but helpful for debugging) ⭐
        console.log("Data fetched by getMyCareerProfile:", JSON.stringify(profile, null, 2));


        res.status(200).json({ success: true, data: profile });

    } catch (error) {
        console.error('Error fetching career profile:', error);
        res.status(500).json({ success: false, message: 'An unexpected server error occurred while fetching the profile.' });
    }
};