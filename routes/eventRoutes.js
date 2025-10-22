import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import mongoose from 'mongoose'; 
import RegistrationPayment from '../models/RegistrationPayment.js';
import Event from '../models/Event.js';
// 🔑 CRITICAL: Import the authentication middleware. 
import auth from '../middleware/auth.js'; 

const router = express.Router();

// Initialize Razorpay (unchanged)
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
    // This route is called from the client, and req.user comes from the main Express file.
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


router.get('/upcoming', async (req, res) => {
    try {
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0); 
        
        const events = await Event.find({ 
            isArchived: false,
            date: { $gte: currentDate }
        }).sort({ date: 1 });
        
        res.json(events);
    } catch (error) {
        console.error('Error fetching upcoming events:', error);
        res.status(500).json({ message: 'Server Error fetching upcoming events' });
    }
});

router.get('/past', async (req, res) => {
    try {
        const currentDate = new Date();
        
        const events = await Event.find({ 
            $or: [
                { isArchived: true },
                { date: { $lt: currentDate } }
            ]
        }).sort({ date: -1 });
        
        res.json(events);
    } catch (error) {
        console.error('Error fetching past events:', error);
        res.status(500).json({ message: 'Server Error fetching past events.' });
    }
});


// ====================================================================
// --- ADMIN PANEL ROUTES (ALL REQUIRE AUTH) ---
// ====================================================================

router.post('/', auth, async (req, res) => { 
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

router.put('/:id', auth, async (req, res) => {
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

router.patch('/finalize/:id', auth, async (req, res) => { 
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

router.delete('/:id', auth, async (req, res) => { 
    try {
        const eventId = req.params.id; 
        
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(404).json({ message: 'Event not found or invalid ID format.' });
        }

        const result = await Event.findByIdAndDelete(eventId);

        if (!result) {
            return res.status(404).json({ message: 'Event not found.' });
        }
        
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

router.put('/archive/:id', auth, async (req, res) => { 
    try {
        const eventId = req.params.id; 
        
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(404).json({ message: 'Archive event not found or invalid ID format.' });
        }
        
        const { title, photoLink, videoLink, resourceLink, externalGalleryUrl } = req.body;

        const updatedArchive = await Event.findByIdAndUpdate(
            eventId, 
            { title, photoLink, videoLink, resourceLink, externalGalleryUrl }, 
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


// --- Admin Registration Data Routes (kept as original) ---
router.get('/admin/registered-events', auth, async (req, res) => { // 🔑 AUTH ADDED
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

router.get('/admin/registrations/:eventId', auth, async (req, res) => { // 🔑 AUTH ADDED
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