import express from 'express';
import RegistrationPayment from '../models/RegistrationPayment.js';
import Event from '../models/Event.js'; // Assuming you have an 'Event' model
// You will also need your authentication middleware here
// import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// NOTE: You should protect these routes with authentication middleware.
// For example: router.get('/events', protect, admin, async (req, res) => { ... });

/**
 * @route   GET /api/admin/events
 * @desc    Get a list of all events for the admin dropdown
 * @access  Private/Admin
 */
router.get('/events', async (req, res) => {
    try {
        // Fetching only title and _id for efficiency. Sort by date descending.
        const events = await Event.find().sort({ date: -1 }).select('title _id');
        res.json(events);
    } catch (error) {
        console.error('Error fetching admin events:', error);
        res.status(500).json({ message: 'Server Error' });
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

export default router;
