import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import mongoose from 'mongoose';
import RegistrationPayment from '../models/RegistrationPayment.js';
import Event from '../models/Event.js';
// 💡 SECURED: Import the auth and isAdmin middleware
import auth, { isAdmin } from '../middleware/auth.js'; 

const router = express.Router();

// --- Razorpay Setup (Unchanged) ---
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

// --- WebSocket Utility (Unchanged) ---
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
// (These routes are correctly left PUBLIC)
// ====================================================================

/**
 * @route   GET /api/events/upcoming (PUBLIC)
 * @desc    Get all non-archived events
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
 * @route   GET /api/events/past (PUBLIC)
 * @desc    Get all archived events
 */
router.get('/past', async (req, res) => {
    try {
        const events = await Event.find({ isArchived: true }).sort({ date: -1 });
        res.json(events);
    } catch (error) {
        console.error('Error fetching past events:', error);
        res.status(500).json({ message: 'Server Error fetching past events.' });
    }
});

/**
 * @route   GET /api/events/:id (PUBLIC)
 * @desc    Get a single event by ID
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

/**
 * @route   POST /api/events/register-free-event (PUBLIC)
 * @desc    Handles registration for events with a total amount of 0
 */
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

/**
 * @route   POST /api/events/create-order (PUBLIC)
 * @desc    Creates a Razorpay order for paid registrations
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
 * @route   POST /api/events/verify-payment (PUBLIC)
 * @desc    Verifies the payment signature from Razorpay after payment
 */
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

// ====================================================================
// --- PRIVATE USER ROUTES ---
// (These routes require a user to be logged in)
// ====================================================================

/**
 * @route   GET /api/events/my-registrations (PRIVATE)
 * @desc    Get events registered by the authenticated user
 */
// 💡 SECURED: Added 'auth' middleware to protect this route
router.get('/my-registrations', auth, async (req, res) => {
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

// ====================================================================
// --- ADMIN PANEL ROUTES ---
// (These routes are now secured and require ADMIN access)
// ====================================================================

/**
 * @route   POST /api/events (ADMIN)
 * @desc    Create a new event
 */
// 💡 SECURED: Added '[auth, isAdmin]' middleware
router.post('/', [auth, isAdmin], async (req, res) => {
    try {
        const newEvent = new Event(req.body);
        await newEvent.save();

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
 * @route   PUT /api/events/:id (ADMIN)
 * @desc    Update an existing event
 */
// 💡 SECURED: Added '[auth, isAdmin]' middleware
router.put('/:id', [auth, isAdmin], async (req, res) => {
    try {
        const eventId = req.params.id; 
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
 * @route   PATCH /api/events/finalize/:id (ADMIN)
 * @desc    Move an event from Upcoming to Archived
 */
// 💡 SECURED: Added '[auth, isAdmin]' middleware
router.patch('/finalize/:id', [auth, isAdmin], async (req, res) => { 
    try {
        const eventId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(404).json({ message: 'Event not found or invalid ID format.' });
        }
        const finalizedEvent = await Event.findByIdAndUpdate(
            eventId,
            { isArchived: true, ...req.body }, 
            { new: true }
        );
        if (!finalizedEvent) {
            return res.status(404).json({ message: 'Event not found.' });
        }
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
 * @route   DELETE /api/events/:id (ADMIN)
 * @desc    Delete an event
 */
// 💡 SECURED: Added '[auth, isAdmin]' middleware
router.delete('/:id', [auth, isAdmin], async (req, res) => {
    try {
        const eventId = req.params.id; 
        
        // 🚀 Add this line to stop execution early if the ID format is bad
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            // Return 400 Bad Request if the format is fundamentally wrong
            return res.status(400).json({ message: 'Invalid Event ID format provided.' }); 
        }

        const result = await Event.findByIdAndDelete(eventId);
        
        if (!result) {
            // Return 404 if the format is valid but no event exists
            return res.status(404).json({ message: 'Event not found in the database.' }); 
        }
        
        // ... success logic ...
        res.json({ message: 'Event deleted successfully.' });
    } catch (error) {
        // This catch block should now only fire for true Server/DB errors.
        console.error('CRITICAL DB ERROR deleting event:', error); 
        res.status(500).json({ message: 'Failed to delete event due to a server error.' });
    }
});

/**
 * @route   PUT /api/events/archive/:id (ADMIN)
 * @desc    Update archive links (media links) for a past event
 */
// 💡 SECURED: Added '[auth, isAdmin]' middleware
router.put('/archive/:id', [auth, isAdmin], async (req, res) => {
    try {
        const eventId = req.params.id; 
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(404).json({ message: 'Archive event not found or invalid ID format.' });
        }
        const { title, photoLink, videoLink, resourceLink } = req.body;
        const updatedArchive = await Event.findByIdAndUpdate(
            eventId, 
            { title, photoLink, videoLink, resourceLink }, 
            { new: true, runValidators: true }
        );
        if (!updatedArchive) {
            return res.status(404).json({ message: 'Archive event not found.' });
        }
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

/**
 * @route   GET /api/events/admin/registered-events (ADMIN)
 * @desc    Get a summary of registrations for the admin panel
 */
// 💡 SECURED: Added '[auth, isAdmin]' middleware
router.get('/admin/registered-events', [auth, isAdmin], async (req, res) => {
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

/**
 * @route   GET /api/events/admin/registrations/:eventId (ADMIN)
 * @desc    Get all registrations for a specific event
 */
// 💡 SECURED: Added '[auth, isAdmin]' middleware
router.get('/admin/registrations/:eventId', [auth, isAdmin], async (req, res) => {
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