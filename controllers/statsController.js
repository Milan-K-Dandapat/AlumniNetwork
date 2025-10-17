import Alumni from '../models/Alumni.js';
import Teacher from '../models/Teacher.js';
// We will add the Event models here later

// @desc    Get key network statistics (user and event counts)
// @route   GET /api/stats
// @access  Public
export const getNetworkStats = async (req, res) => {
    try {
        // Use Promise.all to run the database queries in parallel for maximum speed
        const [alumniCount, facultyCount] = await Promise.all([
            Alumni.countDocuments({ isVerified: true }),
            Teacher.countDocuments({ isVerified: true })
            // We will add the event count query here later
        ]);

        // Send the counts back in a clean JSON object
        res.status(200).json({
            alumni: alumniCount,
            faculty: facultyCount,
        });

    } catch (error) {
        console.error('Error fetching network stats:', error);
        res.status(500).json({ message: 'Server error while fetching network statistics.' });
    }
};