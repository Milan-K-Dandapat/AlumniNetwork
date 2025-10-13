import express from 'express';
import auth from '../middleware/auth.js';
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
        // 🛑 CRITICAL FIX: Change req.user.id to req.user._id
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
        // 🛑 CRITICAL FIX: Change req.user.id to req.user._id
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
            // 🛑 CRITICAL FIX: Change req.user.id to req.user._id
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
        const foundUser = await findUserById(req.params.userId);
        
        if (!foundUser) {
            return res.status(404).json({ msg: 'Profile not found' });
        }
        
        // Remove sensitive fields based on user type (Alumni/Teacher)
        const profile = foundUser.profile.toObject();
        delete profile.password;
        delete profile.otp;
        delete profile.otpExpires;
        
        res.json(profile);
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