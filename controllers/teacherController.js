import Teacher from '../models/Teacher.js'; // Assuming the path is correct
import auth from '../middleware/auth.js'; // Assuming auth middleware import

// Controller to fetch all verified teachers/faculty for the directory
export const getTeachers = [
    auth, // Applies JWT protection
    async (req, res) => {
        try {
            // Find all verified teachers/faculty, sorted by full name
            const teachers = await Teacher.find({ isVerified: true }).sort({ fullName: 1 });
            res.status(200).json(teachers);
        } catch (error) {
            console.error('Error fetching teachers:', error);
            res.status(500).json({ message: 'Error fetching teacher profiles.' });
        }
    }
];