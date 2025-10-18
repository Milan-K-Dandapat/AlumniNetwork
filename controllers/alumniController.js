import Alumni from '../models/Alumni.js';
import auth from '../middleware/auth.js'; 

// This function now fetches ALL alumni so that the Super Admin
// can see the unverified ones and approve them.
export const getAlumni = [
  auth, 
  async (req, res) => {
    try {
      // --- CRITICAL CHANGE HERE ---
      // Removed filter { isVerified: true } so you can see ALL users.
      // The frontend will now handle showing the "Verified" status.
      const alumni = await Alumni.find({}).sort({ createdAt: -1 });
      res.status(200).json(alumni);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching alumni', error });
    }
  }
];

// --- NEW FUNCTION ---
// This function handles the verification logic.
// It is only called when YOU are logged in and hit the new route.
export const verifyAlumni = async (req, res) => {
  try {
    // 1. Find the alumni profile by the ID from the URL
    const alumni = await Alumni.findById(req.params.id);

    if (!alumni) {
      return res.status(404).json({ message: 'Alumni not found' });
    }

    // 2. Update the status
    alumni.isVerified = true;

    // 3. Save the change to the database
    const updatedAlumni = await alumni.save();

    // 4. Send the updated profile back to the frontend
    res.status(200).json(updatedAlumni);

  } catch (error) {
    console.error('Verification Error:', error);
    res.status(500).json({ message: 'Error verifying alumni', error });
  }
};