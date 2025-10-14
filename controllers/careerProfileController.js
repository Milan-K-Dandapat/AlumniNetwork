import CareerProfile from '../models/CareerProfile.js';

/**
 * @desc    Creates or updates a user's career profile.
 * @route   POST /api/career-profile
 * @access  Private (Requires user to be authenticated)
 */
export const saveCareerProfile = async (req, res) => {
    // 1. Get the user ID from your authentication middleware.
    // This ensures that users can only modify their own profile.
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ message: 'Not authorized. Please log in.' });
    }

    // 2. Get the full profile data from the request body.
    // The frontend sends everything, including the resumeFile object with Base64 content.
    const profileData = req.body;

    try {
        // 3. Find the profile by userId and update it, or create it if it doesn't exist.
        // The `...profileData` spread operator efficiently applies all fields from the form
        // to the database document, matching the schema we defined.
        const updatedProfile = await CareerProfile.findOneAndUpdate(
            { userId: userId }, // Query: find the document with this userId
            { ...profileData, userId: userId }, // Update data: apply all new data
            { 
                new: true,          // Option: return the modified document instead of the original
                upsert: true,       // Option: create a new document if one doesn't exist
                runValidators: true // Option: ensure our model's validation rules are checked
            }
        );

        res.status(200).json({ 
            success: true,
            message: 'Career profile saved successfully!', 
            data: updatedProfile 
        });

    } catch (error) {
        console.error('Error saving career profile:', error);
        
        // Handle potential validation errors from the model
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: error.message });
        }
        
        // Handle all other server errors
        res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
    }
};