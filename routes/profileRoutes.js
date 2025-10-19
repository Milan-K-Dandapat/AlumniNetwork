import express from 'express';
import { protect as auth } from '../middleware/auth.js';
import Alumni from '../models/Alumni.js';
import Teacher from '../models/Teacher.js'; 

const router = express.Router();

// --- Helper function to determine model based on data fields (Alumni has 'batch' or 'company') ---
const determineModel = (data) => {
    // If the data contains batch, company, or position, assume Alumni
    if (data.batch || data.company || data.position) {
        return Alumni;
    }
    // If the data contains department or designation, assume Teacher
    if (data.department || data.designation) {
        return Teacher;
    }
    return null; 
};

// --- Helper function to search for a user by ID across both models ---
const findUserById = async (id) => {
    // Check for null/undefined ID before query (important for robustness)
    if (!id) return null;
    
    let user = await Alumni.findById(id).select('-password');
    if (user) return { model: Alumni, profile: user, type: 'alumnus' };
    
    user = await Teacher.findById(id).select('-password');
    if (user) return { model: Teacher, profile: user, type: 'teacher' };

    return null;
};


// @route   GET /api/profile/me
// @desc    Get current user's profile (Must search both models)
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        // CRITICAL FIX: Ensures correct User ID access
        const foundUser = await findUserById(req.user._id); 
        
        if (!foundUser) {
            return res.status(404).json({ msg: 'Profile not found' });
        }
        
        // Return the profile object
        res.json(foundUser.profile);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/profile/me
// @desc    Update current user's profile (Must determine and update correct model)
// @access  Private
router.put('/me', auth, async (req, res) => {
    // 1. Get the profile data and determine the target model
    const payload = req.body;
    let TargetModel = determineModel(payload);
    
    // Fallback: If model couldn't be determined by payload fields, find existing user
    if (!TargetModel) {
        const foundUser = await findUserById(req.user._id);
        if (foundUser) {
             TargetModel = foundUser.model;
        } else {
             return res.status(404).json({ msg: 'User profile not found. Cannot update.' });
        }
    }
    
    try {
        // 2. Update the correct model instance
        const updatedProfile = await TargetModel.findByIdAndUpdate(
            req.user._id, 
            { $set: payload },
            { new: true, runValidators: true }
        ).select('-password'); // Exclude password from the response

        if (!updatedProfile) {
            return res.status(404).json({ msg: 'User profile not found after update attempt' });
        }

        res.json(updatedProfile);
    } catch (err) {
        console.error(err.message);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ msg: err.message });
        }
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/profile/user/:userId
// @desc    Get a user's public profile by their ID (DirectoryItemPage uses this)
// @access  Private
router.get('/user/:userId', auth, async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        const viewingUserId = req.user._id; // The ID of the currently logged-in user

        // Find the user whose profile is being viewed
        const foundUser = await findUserById(targetUserId);
        
        if (!foundUser) {
            return res.status(404).json({ msg: 'Profile not found' });
        }
        
        const profile = foundUser.profile;
        const TargetModel = foundUser.model;
        
        // 1. Increment the profileViews count if the viewer is different from the target
        let newViewsCount = profile.profileViews || 0;

        if (targetUserId.toString() !== viewingUserId.toString()) {
            // Increment the counter directly in the database
            const result = await TargetModel.findByIdAndUpdate(
                targetUserId,
                { $inc: { profileViews: 1 } },
                { new: true, select: 'profileViews' } // Get the newly incremented value
            );

            newViewsCount = result?.profileViews || (newViewsCount + 1);

            // 2. 🚀 CRITICAL: Emit Socket.IO event to update the dashboard in real-time
            if (req.io) {
                // Emit the new profile view count ONLY to the user whose profile was viewed
                req.io.emit(`profileViewed:${targetUserId.toString()}`, newViewsCount);
                console.log(`--- Socket.IO: Emitted profileViewed:${targetUserId} with count: ${newViewsCount} ---`);
            }
        }

        // Remove sensitive fields before sending the response
        const sanitizedProfile = profile.toObject();
        sanitizedProfile.profileViews = newViewsCount; // Ensure the returned profile has the latest count
        delete sanitizedProfile.password;
        delete sanitizedProfile.otp;
        delete sanitizedProfile.otpExpires;
        
        res.json(sanitizedProfile);

    } catch (err) {
        console.error(err.message);
        // If the ID format is invalid (e.g., not a valid MongoDB ID), this catches it
        if (err.name === 'CastError') {
            return res.status(400).json({ msg: 'Invalid user ID format' });
        }
        res.status(500).send('Server Error');
    }
});

export default router;
