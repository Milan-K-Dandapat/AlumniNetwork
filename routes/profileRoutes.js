import express from 'express';
import auth from '../middleware/auth.js';
import Alumni from '../models/Alumni.js';

const router = express.Router();

// @route   GET /api/profile/me
// @desc    Get current user's profile
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        // Fetch profile and exclude the password field
        const profile = await Alumni.findById(req.user.id).select('-password');
        if (!profile) {
            return res.status(404).json({ msg: 'Profile not found' });
        }
        res.json(profile);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/profile/me
// @desc    Update current user's profile
// @access  Private
router.put('/me', auth, async (req, res) => {
    const { 
        fullName, 
        email, 
        phoneNumber, 
        batch, 
        company, 
        position,
        achievements,    
        portfolioUrl,    
        linkedinUrl,     
        achievementPhotos,
        profilePictureUrl // Crucial for direct Cloudinary updates
    } = req.body;

    const profileFields = {
        fullName, 
        email, 
        phoneNumber, 
        batch, 
        company, 
        position,
        achievements,
        portfolioUrl,
        linkedinUrl,
        achievementPhotos,
        profilePictureUrl 
    };

    try {
        const updatedProfile = await Alumni.findByIdAndUpdate(
            req.user.id,
            { $set: profileFields },
            { new: true, runValidators: true }
        ).select('-password');

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

// @route   GET /api/profile/user/:userId
// @desc    Get a user's public profile by their ID (The route needed for DirectoryItemPage)
// @access  Private
router.get('/user/:userId', auth, async (req, res) => {
    try {
        // Find the profile and exclude sensitive data
        const profile = await Alumni.findById(req.params.userId).select('-password -otp -otpExpires -phoneNumber -email');
        
        if (!profile) {
            return res.status(404).json({ msg: 'Profile not found' });
        }
        
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
