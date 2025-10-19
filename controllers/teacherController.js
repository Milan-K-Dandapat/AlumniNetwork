import Teacher from '../models/Teacher.js';
import auth from '../middleware/auth.js';

// Controller to fetch ALL teachers/faculty for the directory
export const getTeachers = [
    auth, // Applies JWT protection
    async (req, res) => {
        try {
            // --- ⬇️ THIS IS THE FIX ⬇️ ---
            // Find ALL teachers, not just verified ones.
            // The frontend will handle showing/hiding the verification status.
            const teachers = await Teacher.find({}).sort({ fullName: 1 });
            // --- ⬆️ THIS IS THE FIX ⬆️ ---

            res.status(200).json(teachers);
        } catch (error) {
            console.error('Error fetching teachers:', error);
            res.status(500).json({ message: 'Error fetching teacher profiles.' });
        }
    }
];
