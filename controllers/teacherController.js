import Teacher from '../models/Teacher.js';
// Removed the import for 'auth' as middleware is applied in the routes file.

// --------------------------------------------------------
// 1. Controller to fetch ALL teachers/faculty for the directory
// --------------------------------------------------------
export const getTeachers = async (req, res) => {
    try {
        // Find ALL teachers, allowing the frontend (DirectoryPage.js) to display
        // both verified and unverified profiles so the Admin can see who needs verifying.
        const teachers = await Teacher.find({}).sort({ fullName: 1 });

        res.status(200).json(teachers);
    } catch (error) {
        console.error('Error fetching teachers:', error);
        res.status(500).json({ message: 'Error fetching teacher profiles.' });
    }
};

// --------------------------------------------------------
// 2. REQUIRED NEW CONTROLLER FUNCTION: verifyTeacher
// Handles the Super Admin's request to set isVerified = true.
// --------------------------------------------------------
export const verifyTeacher = async (req, res) => {
    try {
        const teacherId = req.params.id;

        // Find the teacher by ID and update isVerified to true
        const updatedTeacher = await Teacher.findByIdAndUpdate(
            teacherId,
            { isVerified: true },
            { new: true, runValidators: true } // Return the updated document
        );

        if (!updatedTeacher) {
            return res.status(404).json({ message: 'Teacher not found.' });
        }

        // Send the updated teacher object back to the frontend (DirectoryPage.js)
        res.status(200).json(updatedTeacher);

    } catch (error) {
        console.error('Error verifying teacher:', error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid Teacher ID format' });
        }
        res.status(500).json({ message: 'Failed to verify teacher. Server error.' });
    }
};
