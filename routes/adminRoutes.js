import express from 'express';
import RegistrationPayment from '../models/RegistrationPayment.js';
import Event from '../models/Event.js'; // Assuming you have an 'Event' model
// import { protect, admin } from '../middleware/authMiddleware.js'; // Assuming authentication

const router = express.Router();

// NOTE: Remember to apply authentication middleware to all routes.
// Example: router.get('/registered-events', protect, admin, async (req, res) => { ... });


/**
 * @route   GET /api/admin/registered-events
 * @desc    Get a list of unique events that have successful registrations
 * @access  Private/Admin
 */
router.get('/registered-events', async (req, res) => {
    try {
        // Use aggregation to find unique event IDs and their titles from successful payments
        const registeredEvents = await RegistrationPayment.aggregate([
            // 1. Filter only successful payments
            { $match: { paymentStatus: 'success' } },
            
            // 2. Group by eventId and eventTitle to get unique combinations
            {
                $group: {
                    _id: '$eventId',
                    eventTitle: { $first: '$eventTitle' }, // Grab the title for the group
                    count: { $sum: 1 } // Get a count of registrations per event
                }
            },
            
            // 3. Project the output to match the desired frontend structure
            {
                $project: {
                    _id: 0, // Exclude the default _id field
                    eventId: '$_id', // Rename the grouped ID to eventId
                    eventTitle: 1, // Include the event title
                    count: 1 // Include the count
                }
            },
            
            // 4. Sort alphabetically by title
            { $sort: { eventTitle: 1 } }
        ]);

        res.json(registeredEvents);
    } catch (error) {
        console.error('Error fetching registered events:', error);
        res.status(500).json({ message: 'Server Error during aggregation' });
    }
});


/**
 * @route   GET /api/admin/registrations/:eventId
 * @desc    Get all successful registrations for a specific event
 * @access  Private/Admin
 */
router.get('/registrations/:eventId', async (req, res) => {
    try {
        const { eventId } = req.params;
        if (!eventId) {
            return res.status(400).json({ message: 'Event ID is required' });
        }

        // Find all payments that are successful for the given eventId
        const registrations = await RegistrationPayment.find({ 
            eventId: eventId,
            paymentStatus: 'success' 
        }).sort({ createdAt: -1 });

        res.json(registrations);
    } catch (error) {
        console.error('Error fetching event registrations:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// NOTE: The old GET /api/admin/events route is removed as it is no longer necessary 
// for the Registration tab's purpose.

export default router;