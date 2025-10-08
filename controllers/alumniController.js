import Alumni from '../models/Alumni.js';
import auth from '../middleware/auth.js'; // 👈 1. Import the auth middleware

// This function is no longer needed in a separate controller,
// as the logic is already in your main server.js file.
// However, if you want to keep it separate, it should be protected like this.

export const getAlumni = [ // 👈 2. Wrap the function in an array to include middleware
  auth, // 👈 3. Add the auth middleware first
  async (req, res) => {
    try {
      // Now, only authenticated users can access this list.
      const alumni = await Alumni.find({ isVerified: true }).sort({ createdAt: -1 });
      res.status(200).json(alumni);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching alumni', error });
    }
  }
];