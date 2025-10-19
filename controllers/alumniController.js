import Alumni from '../models/Alumni.js';
// Removed redundant auth import as middleware is handled in routes

// ⬇️ REQUIRED NEW CONTROLLER FUNCTION: verifyAlumni ⬇️
export const verifyAlumni = async (req, res) => {
    try {
        const alumniId = req.params.id;

        // Find the alumni by ID and update isVerified to true
        const updatedAlumni = await Alumni.findByIdAndUpdate(
            alumniId,
            { isVerified: true },
            { new: true, runValidators: true } // Return the new document, run validation
        );

        if (!updatedAlumni) {
            return res.status(404).json({ message: 'Alumni not found.' });
        }

        // Send the updated alumni object back to the frontend (DirectoryPage.js)
        res.status(200).json(updatedAlumni);

    } catch (error) {
        console.error("Error verifying alumni:", error);
        res.status(500).json({ message: 'Failed to verify alumni. Server error.', error: error.message });
    }
};
// ⬆️ END OF NEW CONTROLLER FUNCTION ⬆️

// Your existing getAlumni function. If this is meant to be called by the admin page, 
// it should return all, but based on your previous controller logic, it was restricted.
// Since DirectoryPage fetches all, we will simplify this to fetch all, and let the 
// client-side handle the filtering if needed.

export const getAlumni = async (req, res) => {
    try {
        // Fetch ALL alumni, letting the frontend filter based on its needs (as per DirectoryPage.js)
        const alumni = await Alumni.find({}).sort({ createdAt: -1 });
        res.status(200).json(alumni);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching alumni', error });
    }
};
