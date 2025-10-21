import Alumni from '../models/Alumni.js';

/**
 * @desc    Get all alumni profiles (both verified and unverified)
 * @route   GET /api/alumni
 * @access  Private (Requires auth)
 */
export const getAlumni = async (req, res) => {
    try {
        // --- THIS IS THE FIX ---
        // We fetch ALL alumni by using an empty filter {}
        // This allows the super admin to see unverified users
        const alumni = await Alumni.find({}).sort({ createdAt: -1 });
        
        res.status(200).json(alumni);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching alumni', error: error.message });
    }
};

/**
 * @desc    Verify an alumni profile
 * @route   PATCH /api/alumni/:id/verify
 * @access  Private/SuperAdmin
 */
export const verifyAlumni = async (req, res) => {
    try {
        const alumni = await Alumni.findById(req.params.id);

        if (!alumni) {
            return res.status(4404).json({ message: 'Alumni not found' });
        }

        alumni.isVerified = true;
        const updatedAlumni = await alumni.save();
        
        // Send back the updated user, which the frontend expects
        res.status(200).json(updatedAlumni);

    } catch (error) {
        console.error('Error verifying alumni:', error);
        res.status(500).json({ message: 'Error verifying alumni', error: error.message });
    }
};


/**
 * @desc    Delete an alumni profile
 * @route   DELETE /api/alumni/:id
 * @access  Private/SuperAdmin
 */
export const deleteAlumni = async (req, res) => {
    try {
        const alumni = await Alumni.findById(req.params.id);

        if (!alumni) {
            return res.status(404).json({ message: 'Alumni not found' });
        }

        // The most direct way to delete the document
        await Alumni.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: 'Alumni profile deleted successfully' });

    } catch (error) {
        console.error('Error deleting alumni:', error);
        res.status(500).json({ message: 'Error deleting alumni', error: error.message });
    }
};