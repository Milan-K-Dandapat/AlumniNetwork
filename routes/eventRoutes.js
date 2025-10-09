import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import RegistrationPayment from '../models/RegistrationPayment.js';
import Event from '../models/Event.js';
// Assuming authentication middleware imports if they were used:
// import { protect, admin } from '../middleware/authMiddleware.js'; 

const router = express.Router();

// Initialize Razorpay with your credentials from environment variables
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ====================================================================
// --- PUBLIC FACING & PAYMENT ROUTES ---
// ====================================================================

/**
 * @route   POST /api/register-free-event
 * @desc    Handles registration for events with a total amount of 0
 * @access  Public
 */
router.post('/register-free-event', async (req, res) => {
    try {
        const { eventId } = req.body;

        if (!eventId || eventId === 'N/A') {
            return res.status(400).json({ message: 'A valid Event ID is required for registration.' });
        }

        const newRegistration = new RegistrationPayment({
            ...req.body,
            paymentStatus: 'success',
            razorpay_order_id: `free_event_${Date.now()}`
        });

        await newRegistration.save();
        res.status(201).json({ message: 'Free registration successful!', data: newRegistration });

    } catch (error) {
        console.error('Error in free event registration:', error);
        res.status(500).json({ message: 'Server error during free registration.' });
    }
});

/**
 * @route   POST /api/create-order
 * @desc    Creates a Razorpay order for paid registrations
 * @access  Public
 */
router.post('/create-order', async (req, res) => {
    try {
        const { amount, eventId } = req.body;

        if (!eventId || eventId === 'N/A') {
            return res.status(400).json({ message: 'A valid Event ID is required to create an order.' });
        }

        const registration = new RegistrationPayment({
            ...req.body,
            paymentStatus: 'created',
        });
        await registration.save();

        const options = {
            amount: amount * 100,
            currency: 'INR',
            receipt: registration._id.toString(),
        };

        const order = await razorpay.orders.create(options);

        registration.razorpay_order_id = order.id;
        await registration.save();

        res.json({
            order,
            registrationId: registration._id
        });

    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({ message: 'Failed to create payment order.' });
    }
});

/**
 * @route   POST /api/verify-payment
 * @desc    Verifies the payment signature from Razorpay after payment
 * @access  Public
 */
router.post('/verify-payment', async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            registrationId
        } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            await RegistrationPayment.findByIdAndUpdate(registrationId, {
                paymentStatus: 'success',
                razorpay_payment_id,
                razorpay_signature,
            });
            res.status(200).json({ success: true, message: 'Payment verified successfully.' });
        } else {
            await RegistrationPayment.findByIdAndUpdate(registrationId, {
                paymentStatus: 'failed',
            });
            res.status(400).json({ success: false, message: 'Payment verification failed.' });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ message: 'Server error during payment verification.' });
    }
});


/**
 * @route   GET /api/events/upcoming
 * @desc    Get all non-archived events (PUBLIC)
 * @access  Public
 */
router.get('/upcoming', async (req, res) => {
    try {
        const events = await Event.find({ isArchived: false }).sort({ date: 1 });
        res.json(events);
    } catch (error) {
        console.error('Error fetching upcoming events:', error);
        res.status(500).json({ message: 'Server Error fetching upcoming events' });
    }
});

/**
 * @route   GET /api/events/past  <-- 🚨 CRITICAL ADDITION
 * @desc    Get all archived events (PUBLIC)
 * @access  Public
 */
router.get('/past', async (req, res) => {
    try {
        // Fetch events where isArchived is true, sort by date descending
        const events = await Event.find({ isArchived: true }).sort({ date: -1 });
        res.json(events);
    } catch (error) {
        console.error('Error fetching past events:', error);
        res.status(500).json({ message: 'Server Error fetching past events.' });
    }
});


// ====================================================================
// --- ADMIN PANEL ROUTES ---
// ====================================================================

/**
 * @route   POST /api/events
 * @desc    Create a new event (ADMIN)
 * @access  Private
 */
router.post('/', async (req, res) => {
    // NOTE: Apply authentication middleware here
    try {
        const newEvent = new Event(req.body);
        await newEvent.save();

        // 🚀 CRITICAL: Emit WebSocket event to all clients
        if (req.io) {
            req.io.emit('event_list_updated');
            console.log('--- Socket.IO: Emitted event_list_updated (POST) ---');
        }
        
        res.status(201).json(newEvent);
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ message: 'Failed to create event.' });
    }
});

/**
 * @route   PUT /api/events/:id
 * @desc    Update an existing event (ADMIN)
 * @access  Private
 */
router.put('/:id', async (req, res) => {
    // NOTE: Apply authentication middleware here
    try {
        const eventId = req.params.id; 
        
        const updatedEvent = await Event.findByIdAndUpdate(
            eventId, 
            req.body, 
            { new: true, runValidators: true }
        );

        if (!updatedEvent) {
            return res.status(404).json({ message: 'Event not found.' });
        }
        
        // 🚀 CRITICAL: Emit WebSocket event to all clients
        if (req.io) {
            req.io.emit('event_list_updated');
            console.log('--- Socket.IO: Emitted event_list_updated (PUT) ---');
        }

        res.json(updatedEvent);
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ message: 'Failed to update event.' });
    }
});

/**
 * @route   PATCH /api/events/finalize/:id  <-- 🚨 CRITICAL ADDITION (Used by AdminPage.js)
 * @desc    Move an event from Upcoming to Archived (ADMIN)
 * @access  Private
 */
router.patch('/finalize/:id', async (req, res) => { 
    // NOTE: Apply authentication middleware here
    try {
        const eventId = req.params.id;
        
        // Mark as archived and update optional media links passed in req.body
        const finalizedEvent = await Event.findByIdAndUpdate(
            eventId,
            { isArchived: true, ...req.body }, 
            { new: true }
        );

        if (!finalizedEvent) {
            return res.status(404).json({ message: 'Event not found.' });
        }
        
        // 🚀 CRITICAL: Emit WebSocket event to refresh both upcoming and past lists
        if (req.io) {
            req.io.emit('event_list_updated');
            console.log('--- Socket.IO: Emitted event_list_updated (FINALIZE) ---');
        }

        res.json(finalizedEvent);
    } catch (error) {
        console.error('Error finalizing event:', error);
        res.status(500).json({ message: 'Failed to finalize event.' });
    }
});

/**
 * @route   DELETE /api/events/:id
 * @desc    Delete an event (ADMIN)
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
    // NOTE: Apply authentication middleware here
    try {
        const eventId = req.params.id; 
        const result = await Event.findByIdAndDelete(eventId);

        if (!result) {
            return res.status(404).json({ message: 'Event not found.' });
        }
        
        // 🚀 CRITICAL: Emit WebSocket event to all clients
        if (req.io) {
            req.io.emit('event_list_updated');
            console.log('--- Socket.IO: Emitted event_list_updated (DELETE) ---');
        }

        res.json({ message: 'Event deleted successfully.' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ message: 'Failed to delete event.' });
    }
});

/**
 * @route   PUT /api/events/archive/:id
 * @desc    Update archive links (media links) for a past event (ADMIN)
 * @access  Private
 */
router.put('/archive/:id', async (req, res) => {
    // NOTE: Apply authentication middleware here
    try {
        const eventId = req.params.id; 
        
        // Only update the specific fields passed from the admin UI
        const { title, photoLink, videoLink, resourceLink } = req.body;

        const updatedArchive = await Event.findByIdAndUpdate(
            eventId, 
            { title, photoLink, videoLink, resourceLink }, 
            { new: true, runValidators: true }
        );

        if (!updatedArchive) {
            return res.status(404).json({ message: 'Archive event not found.' });
        }

        // Emit event to update public pages
        if (req.io) {
            req.io.emit('event_list_updated');
            console.log('--- Socket.IO: Emitted event_list_updated (ARCHIVE PUT) ---');
        }

        res.json(updatedArchive);
    } catch (error) {
        console.error('Error updating archive links:', error);
        res.status(500).json({ message: 'Failed to update archive links.' });
    }
});


// --- Admin Registration Data Routes (kept as original) ---
router.get('/admin/registered-events', async (req, res) => {
    try {
        const registeredEvents = await RegistrationPayment.aggregate([
            { $match: { paymentStatus: 'success' } },
            {
                $group: {
                    _id: '$eventId',
                    eventTitle: { $first: { $ifNull: [ '$eventTitle', 'Untitled Event' ] } }, 
                    count: { $sum: 1 } 
                }
            },
            {
                $project: {
                    _id: 0, 
                    eventId: '$_id', 
                    eventTitle: 1, 
                    count: 1 
                }
            },
            { $sort: { eventTitle: 1 } }
        ]);

        res.json(registeredEvents);
    } catch (error) {
        console.error('CRITICAL AGGREGATION FAILURE for registered-events:', error); 
        res.status(500).json({ message: 'Server Error: Failed to fetch registration summary.' });
    }
});

router.get('/admin/registrations/:eventId', async (req, res) => {
    // NOTE: Apply authentication middleware here
    try {
        const { eventId } = req.params;
        if (!eventId) {
            return res.status(400).json({ message: 'Event ID is required' });
        }

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