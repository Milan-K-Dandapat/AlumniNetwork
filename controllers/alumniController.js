import Alumni from '../models/Alumni.js';

// --- UPDATED ---
// Removed the 'auth' middleware wrapper.
// Your 'alumniRoutes.js' file is already handling authentication.
// This is now a standard named export.
export const getAlumni = async (req, res) => {
    try {
        // This code now runs *after* the 'auth' middleware in your routes file.
        const alumni = await Alumni.find({ isVerified: true }).sort({ createdAt: -1 });
        res.status(200).json(alumni);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching alumni', error: error.message });
    }
};

// --- NEW ---
// This function verifies an alumni user
// It's triggered by PATCH /api/alumni/:id/verify
export const verifyAlumni = async (req, res) => {
    try {
        const alumni = await Alumni.findById(req.params.id);

        if (!alumni) {
            return res.status(404).json({ message: 'Alumni not found' });
        }

        alumni.isVerified = true;
        const updatedAlumni = await alumni.save();
        
        // Send back the updated user, which your frontend code expects
        res.status(200).json(updatedAlumni);

    } catch (error) {
        console.error('Error verifying alumni:', error);
        res.status(500).json({ message: 'Error verifying alumni', error: error.message });
    }
};


// --- NEW ---
// This function deletes an alumni user
// It's triggered by DELETE /api/alumni/:id
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