import Alumni from '../models/Alumni.js';

// @desc    Get all alumni (verified and unverified)
// @route   GET /api/alumni
// @access  Private (Authenticated Users)
export const getAlumni = async (req, res) => {
    try {
        // Fetch ALL alumni profiles. The client (DirectoryPage.js) handles
        // what is displayed based on 'isVerified'.
        const alumni = await Alumni.find().sort({ batch: -1, fullName: 1 });
        res.status(200).json(alumni);
    } catch (error) {
        console.error('Error fetching alumni:', error);
        res.status(500).json({ message: 'Error fetching alumni', error: error.message });
    }
};

// @desc    Verify an Alumni profile
// @route   PATCH /api/alumni/:id/verify
// @access  Private (Super Admin Only)
export const verifyAlumni = async (req, res) => {
    try {
        const alumni = await Alumni.findById(req.params.id);

        if (!alumni) {
            return res.status(404).json({ message: 'Alumni not found' });
        }

        // Set isVerified to true (CORE LOGIC)
        alumni.isVerified = true;
        
        const updatedAlumni = await alumni.save();

        // Respond with the updated profile
        res.status(200).json(updatedAlumni);

    } catch (error) {
        console.error('Error verifying alumni:', error);
        if (error.kind === 'ObjectId') {
             return res.status(400).json({ message: 'Invalid Alumni ID format' });
        }
        res.status(500).json({ message: 'Server error during verification', error: error.message });
    }
};
