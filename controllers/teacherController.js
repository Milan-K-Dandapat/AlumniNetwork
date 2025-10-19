import Teacher from '../models/Teacher.js';
// FIX: Import the 'protect' function from auth.js and alias it as 'auth' 
// to match the original middleware usage (auth,)
import { protect as auth } from '../middleware/auth.js';

// Controller to fetch ALL teachers/faculty for the directory
export const getTeachers = [
    auth, // Applies JWT protection (now correctly referencing 'protect')
    async (req, res) => {
        try {
            // Find ALL teachers, not just verified ones.
            // The frontend will handle showing/hiding the verification status.
            const teachers = await Teacher.find({}).sort({ fullName: 1 });

            res.status(200).json(teachers);
        } catch (error) {
            console.error('Error fetching teachers:', error);
            res.status(500).json({ message: 'Error fetching teacher profiles.' });
        }
    }
];
