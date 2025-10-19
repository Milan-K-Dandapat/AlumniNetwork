import CareerProfile from '../models/CareerProfile.js';

// --- SAVE/UPDATE Career Profile (POST /api/career-profile) ---
export const saveCareerProfile = async (req, res) => {
    // Get the user ID attached by the 'auth.js' middleware
    const userId = req.user?._id; 
    
    // Security check: Ensure user is authenticated
    if (!userId) {
        return res.status(401).json({ success: false, message: 'Not authorized. User ID not found.' });
    }

    // --- CRITICAL: Parse the JSON String from FormData ---
    let parsedProfileData;
    try {
        if (!req.body.profileData) {
            return res.status(400).json({ success: false, message: 'Missing career profile data in request body.' });
        }
        
        // Data from client is a JSON string due to FormData structure
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

    // --- Handle Resume File from Multer (req.file) ---
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
    
    // --- ⭐ Combine profile data, emails, file info, and user ID ---
    const dataToSave = {
        ...parsedProfileData,
        ...fileInfo,
        userId: userId,
        // Explicitly add the new email fields to ensure they are saved
        professionalEmail: parsedProfileData.professionalEmail,
        personalEmail: parsedProfileData.personalEmail,
    };
    
    // Clean up temporary client-side flags before saving
    delete dataToSave.resumeFile;   
    delete dataToSave.uploadLater; 

    try {
        // Use upsert to create or update the profile based on userId
        const updatedProfile = await CareerProfile.findOneAndUpdate(
            { userId: userId },
            dataToSave, 
            { 
                new: true,       // Return the updated document
                upsert: true,      // Create if it doesn't exist
                runValidators: true // Run Mongoose schema validation
            }
        ).lean(); 

        if (!updatedProfile) {
            return res.status(500).json({ success: false, message: 'Profile could not be created or updated.' });
        }
        
        console.log(`Profile for user ${userId} saved successfully.`);

        // Send a successful response back to the client
        res.status(200).json({ 
            success: true,
            message: 'Career profile saved successfully!', 
            data: updatedProfile 
        });

    } catch (error) {
        console.error('Error saving career profile:', error.message);
        
        // Handle Mongoose Validation Errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        
        // Handle other server errors
        res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
    }
};

// --- ⭐ NEW: GET My Career Profile (GET /api/career-profile/me) ⭐ ---
export const getMyCareerProfile = async (req, res) => {
    const userId = req.user?._id; // User ID from the auth middleware
    
    if (!userId) {
        // This should not happen if auth middleware works, but serves as a final check
        return res.status(401).json({ success: false, message: 'Not authorized.' });
    }

    try {
        const profile = await CareerProfile.findOne({ userId: userId }).lean();

        if (!profile) {
            // Send 404 if the profile doesn't exist. The frontend handles this by switching to 'builder' view.
            return res.status(404).json({ success: false, message: 'Career profile not found for this user.' });
        }

        res.status(200).json({ success: true, data: profile });

    } catch (error) {
        console.error('Error fetching career profile:', error);
        res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
    }
};