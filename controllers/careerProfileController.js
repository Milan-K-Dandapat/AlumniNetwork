import CareerProfile from '../models/CareerProfile';
// Assuming you have a standard authentication middleware that puts 'req.user.id' on the request object.

/**
 * @desc Saves or updates the user's career profile.
 * @route POST /api/profile/save-career (Used for first time submission)
 * @route PUT /api/profile/save-career (Used for editing)
 * @access Private (Requires authentication/token)
 */
export const saveCareerProfile = async (req, res) => {
    // IMPORTANT: Assuming your auth middleware populates req.user.id
    const userId = req.user.id; 
    const profileData = req.body;
    
    // NOTE: In a real app, file uploads (like the resume) would need a separate 
    // endpoint or middleware (like Multer/Cloudinary) before this controller receives the URL.
    // Assuming profileData.resumeFileUrl is what you send after the file is uploaded.

    try {
        // We use findOneAndUpdate with { upsert: true } to create the profile 
        // if it doesn't exist (POST) or update it if it does (PUT/Edit).
        const updatedProfile = await CareerProfile.findOneAndUpdate(
            { userId: userId },
            { 
                // Spread the entire payload from the frontend
                ...profileData, 
                userId: userId // Ensure userId is set
            },
            { 
                new: true, // Return the updated document
                upsert: true, // Create a new document if one doesn't exist
                runValidators: true // Enforce schema validators on update
            }
        );

        // Optional: Update the base Alumni/Teacher profile with 'hasCareerProfile: true'
        // await Alumni.findByIdAndUpdate(userId, { hasCareerProfile: true });

        res.status(200).json({ 
            message: 'Career profile saved successfully.', 
            profile: updatedProfile 
        });

    } catch (error) {
        console.error('Error saving career profile:', error);
        // Mongoose validation error handling
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Server error during profile submission.' });
    }
};