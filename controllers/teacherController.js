import Teacher from '../models/Teacher.js';
import auth from '../middleware/auth.js';

// Controller to fetch ALL teachers/faculty for the directory
export const getTeachers = [
    auth, // Applies JWT protection
    async (req, res) => {
        try {
            // Find ALL teachers, not just verified ones.
            const teachers = await Teacher.find({}).sort({ fullName: 1 });
            
            res.status(200).json(teachers);
        } catch (error) {
            console.error('Error fetching teachers:', error);
            res.status(500).json({ message: 'Error fetching teacher profiles.' });
        }
    }
];
