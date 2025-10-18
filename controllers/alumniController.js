import Alumni from '../models/Alumni.js';
import auth from '../middleware/auth.js'; 

// This function now fetches ALL alumni (verified AND unverified)
export const getAlumni = [
  auth, 
  async (req, res) => {
    try {
      // --- THIS IS THE FIX ---
      // We find ALL alumni by using an empty filter {}.
      // The frontend will now receive all users.
      const alumni = await Alumni.find({}).sort({ createdAt: -1 });
      res.status(200).json(alumni);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching alumni', error });
    }
  }
];

// This is your Super Admin verification function (it is already correct)
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