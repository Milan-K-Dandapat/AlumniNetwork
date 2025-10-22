import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import mongoose from 'mongoose'; 
import RegistrationPayment from '../models/RegistrationPayment.js';
import Event from '../models/Event.js';
// 🔑 ASSUMPTION: Import authentication middleware. Replace with your actual path.
// import { protect, admin } from '../middleware/authMiddleware.js'; 

const router = express.Router();

// Initialize Razorpay with your credentials from environment variables
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

let razorpay;
if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
        key_id: RAZORPAY_KEY_ID,
        key_secret: RAZORPAY_KEY_SECRET,
    });
} else {
    console.warn("⚠️ RAZORPAY NOT INITIALIZED: Missing KEY_ID or KEY_SECRET. Payment routes will fail.");
    razorpay = { orders: { create: async () => { throw new Error("Razorpay not configured."); } } };
}

// Utility function to fetch and emit the user's updated event list (Unchanged)
const fetchAndEmitUpdatedEvents = async (io, userId) => {
    if (!io || !userId) return;

    try {
        const updatedEventsList = await RegistrationPayment.find({ 
            userId: userId, 
            paymentStatus: 'success' 
        })
        .populate('eventId', 'title date') 
        .exec();

        const registeredEvents = updatedEventsList.map(reg => ({
            id: reg.eventId?._id,
            name: reg.eventId?.title,
            date: reg.eventId?.date,
            registrationDate: reg.createdAt,
        }));

        io.emit(`eventsUpdated:${userId}`, registeredEvents); 
        console.log(`--- Socket.IO: Emitted eventsUpdated:${userId} for ${registeredEvents.length} events ---`);
    } catch (error) {
        console.error(`Failed to fetch/emit events for user ${userId}:`, error);
    }
};

// ====================================================================
// --- PUBLIC FACING & PAYMENT ROUTES ---
// ====================================================================

/**
 * @route   GET /api/events/:id 
 * @desc    Get a single event by ID (PUBLIC)
 */
router.get('/:id', async (req, res) => {
    const eventId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
        return res.status(404).json({ message: 'Event not found or invalid ID format.' });
    }
    
    try {
        const event = await Event.findById(eventId); 

        if (!event) {
            return res.status(404).json({ message: 'Event not found.' });
        }

        res.status(200).json(event);

    } catch (err) {
        console.error('Error fetching single event details:', err);
        res.status(500).json({ message: 'Server error fetching event details.' });
    }
});

// ... (Router.post for /register-free-event, /create-order, and /verify-payment are unchanged) ...

router.post('/register-free-event', async (req, res) => {
    try {
        const { eventId, userId } = req.body; 

        if (!eventId || eventId === 'N/A') {
            return res.status(400).json({ message: 'A valid Event ID is required for registration.' });
        }

        const newRegistration = new RegistrationPayment({
            ...req.body,
            paymentStatus: 'success',
            razorpay_order_id: `free_event_${Date.now()}`
        });

        await newRegistration.save();

        if (req.io && userId) {
            await fetchAndEmitUpdatedEvents(req.io, userId);
        }
        
        res.status(201).json({ message: 'Free registration successful!', data: newRegistration });

    } catch (error) {
        console.error('Error in free event registration:', error);
        res.status(500).json({ message: 'Server error during free registration.' });
    }
});

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

        res.json({ order, registrationId: registration._id });

    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({ message: 'Failed to create payment order.' });
    }
});

router.post('/verify-payment', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, registrationId } = req.body;

        const registrationToUpdate = await RegistrationPayment.findById(registrationId);
        
        if (!registrationToUpdate) {
             return res.status(404).json({ success: false, message: 'Registration record not found.' });
        }
        
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            
            registrationToUpdate.paymentStatus = 'success';
            registrationToUpdate.razorpay_payment_id = razorpay_payment_id;
            registrationToUpdate.razorpay_signature = razorpay_signature;
            await registrationToUpdate.save();
            
            const userId = registrationToUpdate.userId; 

            if (req.io && userId) {
                await fetchAndEmitUpdatedEvents(req.io, userId);
            }

            res.status(200).json({ success: true, message: 'Payment verified successfully.' });
        } else {
            registrationToUpdate.paymentStatus = 'failed';
            await registrationToUpdate.save();
            res.status(400).json({ success: false, message: 'Payment verification failed.' });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ message: 'Server error during payment verification.' });
    }
});

router.get('/my-registrations', async (req, res) => {
    const userId = req.user?._id; 

    if (!userId) {
        return res.status(401).json({ message: 'Not authorized or User ID missing.' });
    }
    
    try {
        const events = await RegistrationPayment.find({ 
            userId: userId,
            paymentStatus: 'success'
        })
        .populate('eventId', 'title date')
        .sort({ createdAt: -1 });

        const registeredEvents = events.map(reg => ({
            id: reg.eventId?._id,
            name: reg.eventId?.title,
            date: reg.eventId?.date,
            registrationDate: reg.createdAt,
        }));

        res.json(registeredEvents);
    } catch (error) {
        console.error('Error fetching user registrations:', error);
        res.status(500).json({ message: 'Server Error fetching user registrations' });
    }
});


/**
 * @route   GET /api/events/upcoming 
 * @desc    Get all non-archived events with a future date (PUBLIC)
 * @access  Public
 */
router.get('/upcoming', async (req, res) => {
    try {
        // 🔑 CRITICAL FIX: Filter by date >= current date AND must NOT be archived.
        const currentDate = new Date();
        // Set time to start of day to ensure today's events are included if time hasn't passed
        currentDate.setHours(0, 0, 0, 0); 
        
        const events = await Event.find({ 
            isArchived: false,
            date: { $gte: currentDate } // Date is greater than or equal to today
        }).sort({ date: 1 });
        
        res.json(events);
    } catch (error) {
        console.error('Error fetching upcoming events:', error);
        res.status(500).json({ message: 'Server Error fetching upcoming events' });
    }
});

/**
 * @route   GET /api/events/past 
 * @desc    Get all archived events OR non-archived events with a past date (PUBLIC)
 * @access  Public
 */
router.get('/past', async (req, res) => {
    try {
        // 🔑 CRITICAL FIX: Filter by date < current date OR where isArchived is true.
        const currentDate = new Date();
        
        const events = await Event.find({ 
            $or: [
                { isArchived: true }, // Events manually archived by admin
                { date: { $lt: currentDate } } // Events where date is strictly in the past
            ]
        }).sort({ date: -1 }); // Sort by date descending (most recent past event first)
        
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
 * @route   POST /api/events (Unchanged)
 * @desc    Create a new event (ADMIN)
 * @access  Private
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
 * @route   PUT /api/events/:id (Unchanged)
 * @desc    Update an existing event (ADMIN)
 * @access  Private
 */
router.put('/:id', async (req, res) => {
    // NOTE: Apply authentication middleware here
    try {
        const eventId = req.params.id; 
        
        // Ensure ID is valid before attempting findByIdAndUpdate
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(404).json({ message: 'Event not found or invalid ID format.' });
        }

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
 * @route   PATCH /api/events/finalize/:id (Unchanged)
 * @desc    Move an event from Upcoming to Archived (ADMIN)
 * @access  Private
 */
router.patch('/finalize/:id', async (req, res) => { 
    // NOTE: Apply authentication middleware here
    try {
        const eventId = req.params.id;
        
        // Ensure ID is valid before attempting findByIdAndUpdate
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(404).json({ message: 'Event not found or invalid ID format.' });
        }

        // Mark as archived and update optional media links passed in req.body (including externalGalleryUrl now)
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
 * @route   DELETE /api/events/:id (Unchanged)
 * @desc    Delete an event (ADMIN)
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
    // NOTE: Apply authentication middleware here
    try {
        const eventId = req.params.id; 
        
        // Ensure ID is valid before attempting findByIdAndDelete
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(404).json({ message: 'Event not found or invalid ID format.' });
        }

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
 * @route   PUT /api/events/archive/:id 
 * @desc    Update archive links (media links) for a past event (ADMIN)
 * @access  Private
 */
router.put('/archive/:id', async (req, res) => {
    // NOTE: Apply authentication middleware here
    try {
        const eventId = req.params.id; 
        
        // Ensure ID is valid before attempting findByIdAndUpdate
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(404).json({ message: 'Archive event not found or invalid ID format.' });
        }
        
        // 🔑 FIX: Include externalGalleryUrl in the fields to be updated
        const { title, photoLink, videoLink, resourceLink, externalGalleryUrl } = req.body;

        const updatedArchive = await Event.findByIdAndUpdate(
            eventId, 
            { title, photoLink, videoLink, resourceLink, externalGalleryUrl }, 
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