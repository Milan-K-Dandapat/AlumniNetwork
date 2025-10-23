import CareerProfile from '../models/CareerProfile.js';
// ⭐ CRITICAL IMPORTS: Need access to the primary user models to fetch the permanent email
import Alumni from '../models/Alumni.js';
import Teacher from '../models/Teacher.js';

// --- Helper function to find the primary user in either collection ---
const findPrimaryUser = async (userId) => {
    // Check if the ID is valid before querying (optional, but good practice)
    if (!userId) return null;

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
        if (!req.body.profileData) {
            return res.status(400).json({ success: false, message: 'Missing career profile data in request body.' });
        }
        
        parsedProfileData = JSON.parse(req.body.profileData);

        // Convert the stringified arrays back to JS arrays
        if (parsedProfileData.keySkills && typeof parsedProfileData.keySkills === 'string') {
            parsedProfileData.keySkills = JSON.parse(parsedProfileData.keySkills);
        }
        if (parsedProfileData.preferredLocations && typeof parsedProfileData.preferredLocations === 'string') {
            parsedProfileData.preferredLocations = JSON.parse(parsedProfileData.preferredLocations);
        }

    } catch (parseError) {
        console.error('Error parsing profileData JSON:', parseError);
        return res.status(400).json({ success: false, message: 'Invalid format for profile data.' });
    }

    // --- 4. Handle Resume File from Multer (req.file) ---
    const fileInfo = {};
    if (req.file) {
        // Multer successfully uploaded the file; save its path and metadata
        fileInfo.resumePath = req.file.path; 
        fileInfo.resumeFilename = req.file.filename;
        fileInfo.resumeUploadedAt = new Date();
    } else {
        // If no file was uploaded, check the 'upload later' flag
        if (parsedProfileData.uploadLater) {
             fileInfo.resumePath = 'upload_later'; 
        } 
    }
    
    // --- 5. Combine and Clean Data (The Fix) ---
    const dataToSave = {
        ...parsedProfileData,
        ...fileInfo,
        userId: userId, // CRITICAL: Use the unique MongoDB ID
        // ⭐ PERMANENT FIX: OVERWRITE personalEmail with the verified primary user email.
        // This makes the personalEmail immutable and ensures it's correct.
        personalEmail: primaryUser.email, 
    };
    
    // Clean up temporary client-side flags and the unverified email field
    delete dataToSave.resumeFile;   
    delete dataToSave.uploadLater; 
    // Remove the potentially altered personalEmail sent from the client's form
    delete dataToSave.personalEmail; 
    
    try {
        // 6. Use upsert to create or update the profile based on the unique userId
        const updatedProfile = await CareerProfile.findOneAndUpdate(
            { userId: userId }, // Query ONLY by the unique user's ID
            dataToSave, 
            { 
                new: true,       // Return the updated document
                upsert: true,      // Create if it doesn't exist
                runValidators: true // Run Mongoose schema validation
            }
        ).lean(); 

        if (!updatedProfile) {
            return res.status(500).json({ success: false, message: 'Profile could not be created or updated.' });
        }
        
        console.log(`Profile for user ${userId} saved successfully. Email: ${updatedProfile.personalEmail}`);

        // Send a successful response back to the client
        res.status(200).json({ 
            success: true,
            message: 'Career profile saved successfully!', 
            data: updatedProfile 
        });

    } catch (error) {
        console.error('Error saving career profile:', error.message);
        
        // Handle Mongoose Validation Errors (including 'unique' constraint violation)
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        
        // Handle the unique index error (E11000) if a user tries to create a 
        // second profile after the data fix, or if the personalEmail conflicts.
        if (error.code === 11000) {
            let field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({ success: false, message: `A profile already exists for this ${field}. You can only edit your existing profile.` });
        }
        
        res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
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
        const profile = await CareerProfile.findOne({ userId: userId }).lean();

        if (!profile) {
            // Returns 404, prompting the frontend to show the Profile Builder
            return res.status(404).json({ success: false, message: 'Career profile not found for this user.' });
        }

        res.status(200).json({ success: true, data: profile });

    } catch (error) {
        console.error('Error fetching career profile:', error);
        res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
    }
};