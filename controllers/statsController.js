import Alumni from '../models/Alumni.js';
import Teacher from '../models/Teacher.js';
import Event from '../models/Event.js'; // 👈 1. IMPORT the Event model

// @desc    Get key network statistics (user and event counts)
// @route   GET /api/stats
// @access  Public
export const getNetworkStats = async (req, res) => {
    try {
        // Use Promise.all to run all database queries in parallel for maximum speed
        const [alumniCount, facultyCount, eventCount] = await Promise.all([ // 👈 2. Add eventCount
            Alumni.countDocuments({ isVerified: true }),
            Teacher.countDocuments({ isVerified: true }),
            Event.countDocuments({}) // 👈 3. Add the query to count ALL events
        ]);

        // Send all the counts back in a clean JSON object
        res.status(200).json({
            alumni: alumniCount,
            faculty: facultyCount,
            totalEvents: eventCount, // 👈 4. Add the new event count to the response
        });

    } catch (error) {
        console.error('Error fetching network stats:', error);
        res.status(500).json({ message: 'Server error while fetching network statistics.' });
    }
};