// controllers/careerProfileController.js

import CareerProfile from '../models/CareerProfile.js';

export const saveCareerProfile = async (req, res) => {
    // Get the user ID attached by your 'auth.js' middleware
    const userId = req.user?._id;
    
    // Security check: Ensure a user ID is present
    if (!userId) {
        return res.status(401).json({ message: 'Not authorized. User ID not found.' });
    }

    // Get the complete form data from the frontend
    const profileData = req.body;

    try {
        // Find a profile by the user's ID and update it,
        // or create a new one if it doesn't exist (`upsert: true`).
        const updatedProfile = await CareerProfile.findOneAndUpdate(
            { userId: userId },
            { ...profileData, userId: userId }, // Apply all data from the form
            { 
                new: true,          // Return the updated document
                upsert: true,       // Create if it doesn't exist
                runValidators: true // Run schema validations
            }
        );

        // Send a successful response
        res.status(200).json({ 
            success: true,
            message: 'Career profile saved successfully!', 
            data: updatedProfile 
        });

    } catch (error) {
        console.error('Error saving career profile:', error);
        
        // Handle specific validation errors from the model
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: error.message });
        }
        
        // Handle any other server-side errors
        res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
    }
};