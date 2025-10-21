import Teacher from '../models/Teacher.js';
// We no longer need to import 'auth' here
// import auth from '../middleware/auth.js'; 

// --- UPDATED ---
// Removed the 'auth' middleware wrapper.
// Your 'teacherRoutes.js' file is already handling authentication.
export const getTeachers = async (req, res) => {
    try {
        // This query is CORRECT. You need to find all teachers ({})
        // so that you can see the unverified ones in the admin panel.
        const teachers = await Teacher.find({}).sort({ fullName: 1 });
        
        res.status(200).json(teachers);
    } catch (error) {
        console.error('Error fetching teachers:', error);
        res.status(500).json({ message: 'Error fetching teacher profiles.', error: error.message });
    }
};

// --- NEW ---
// This function verifies a teacher user
// It's triggered by PATCH /api/teachers/:id/verify
export const verifyTeacher = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id);

        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        teacher.isVerified = true;
        const updatedTeacher = await teacher.save();
        
        // Send back the updated user, which your frontend code expects
        res.status(200).json(updatedTeacher);

    } catch (error) {
        console.error('Error verifying teacher:', error);
        res.status(500).json({ message: 'Error verifying teacher', error: error.message });
    }
};


// --- NEW ---
// This function deletes a teacher user
// It's triggered by DELETE /api/teachers/:id
export const deleteTeacher = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id);

        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        // The most direct way to delete the document
        await Teacher.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: 'Teacher profile deleted successfully' });

    } catch (error) {
        console.error('Error deleting teacher:', error);
        res.status(500).json({ message: 'Error deleting teacher', error: error.message });
    }
};