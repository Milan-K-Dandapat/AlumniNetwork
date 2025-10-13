import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import RegistrationPayment from '../models/RegistrationPayment.js';
import Event from '../models/Event.js';
// 🛑 CRITICAL IMPORT: The authentication middleware is required for all private routes
import auth from '../middleware/auth.js'; 

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

// Utility function to fetch and emit the user's updated event list
const fetchAndEmitUpdatedEvents = async (io, userId) => {
    if (!io || !userId) return;

    try {
        // Fetch the user's complete updated list of SUCCESSFUL registrations
        const updatedEventsList = await RegistrationPayment.find({ 
            userId: userId, 
            paymentStatus: 'success' 
        })
        .populate('eventId', 'title date') 
        .exec();

        // Map the result to a cleaner structure that the frontend expects
        const registeredEvents = updatedEventsList.map(reg => ({
            id: reg.eventId?._id,
            name: reg.eventId?.title,
            date: reg.eventId?.date,
            registrationDate: reg.createdAt,
        }));

        // Emit the personalized event to the user's dashboard
        io.emit(`eventsUpdated:${userId.toString()}`, registeredEvents); 
        console.log(`--- Socket.IO: Emitted eventsUpdated:${userId} for ${registeredEvents.length} events ---`);
    } catch (error) {
        console.error(`Failed to fetch/emit events for user ${userId}:`, error);
    }
};

// ====================================================================
// --- PUBLIC FACING & PAYMENT ROUTES ---
// ====================================================================

/**
 * @route   POST /api/register-free-event
 * @desc    Handles registration for events with a total amount of 0
 * @access  Public
 */
// 🛑 FIX: Apply auth middleware to securely get the userId
router.post('/register-free-event', auth, async (req, res) => {
    try {
        const { eventId, ...otherDetails } = req.body; 
        // Get userId securely from the token attached by the 'auth' middleware
        const userId = req.user._id;

        if (!eventId || eventId === 'N/A') {
            return res.status(400).json({ message: 'A valid Event ID is required for registration.' });
        }

        const newRegistration = new RegistrationPayment({
            ...otherDetails,
            userId: userId, // CRITICAL: Save the authenticated userId
            paymentStatus: 'success',
            razorpay_order_id: `free_event_${Date.now()}`
        });

        await newRegistration.save();

        // 🚀 CRITICAL: Emit WebSocket event for Real-Time Update
        if (req.io && userId) {
            await fetchAndEmitUpdatedEvents(req.io, userId.toString());
        }
        
        res.status(201).json({ message: 'Free registration successful!', data: newRegistration });

    } catch (error) {
        console.error('Error in free event registration:', error);
        res.status(500).json({ message: 'Server error during free registration.' });
    }
});

/**
 * @route   POST /api/create-order
 * @desc    Creates a Razorpay order for paid registrations
 * @access  Public
 */
// 🛑 FIX: Apply auth middleware so we can get the userId before saving the registration record
router.post('/create-order', auth, async (req, res) => {
    try {
        const { amount, eventId, ...otherDetails } = req.body;
        const userId = req.user._id; // CRITICAL: Get userId securely

        if (!eventId || eventId === 'N/A') {
            return res.status(400).json({ message: 'A valid Event ID is required to create an order.' });
        }

        const registration = new RegistrationPayment({
            ...otherDetails,
            userId: userId, // CRITICAL: Save the authenticated userId
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
 * @route   POST /api/verify-payment
 * @desc    Verifies the payment signature from Razorpay after payment
 * @access  Public
 */
// 🛑 CRITICAL FIX: Add auth middleware so req.user is available
router.post('/verify-payment', auth, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, registrationId } = req.body;
        // The userId is not strictly needed here for verification, 
        // but it is available via req.user._id if needed later.

        const registrationToUpdate = await RegistrationPayment.findById(registrationId);
        
        if (!registrationToUpdate) {
             return res.status(404).json({ success: false, message: 'Registration record not found.' });
        }
        
        // This is the point where the registration record is finalized.
        // If the registration was created earlier, it already has the userId.
        
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

            // 🚀 CRITICAL: Emit WebSocket event for Real-Time Update
            if (req.io && userId) {
                await fetchAndEmitUpdatedEvents(req.io, userId.toString());
            }

            res.status(200).json({ success: true, message: 'Payment verified successfully.' });
        } else {
            // Payment failed or signature mismatch
            registrationToUpdate.paymentStatus = 'failed';
            await registrationToUpdate.save();
            res.status(400).json({ success: false, message: 'Payment verification failed.' });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ message: 'Server error during payment verification.' });
    }
});

// NEW: Endpoint to fetch the registered events for a specific user (Required by Dashboard)
/**
 * @route  GET /api/events/my-registrations
 * @desc   Get events registered by the authenticated user
 * @access Private (Requires authentication/protection middleware)
 */
// THIS ROUTE WAS ALREADY CORRECTLY FIXED IN PREVIOUS STEPS
router.get('/my-registrations', auth, async (req, res) => {
    // FIX: Get user ID securely from the token
    const userId = req.user._id; 

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

        // The dashboard expects a clean array of event objects: [{id, name, date, ...}]
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
 * @desc    Get all non-archived events (PUBLIC)
 * @access  Public
 */
router.get('/upcoming', async (req, res) => {
// ... (code for upcoming events)
});

/**
 * @route   GET /api/events/past  <-- 🚨 CRITICAL ADDITION
 * @desc    Get all archived events (PUBLIC)
 * @access  Public
 */
router.get('/past', async (req, res) => {
// ... (code for past events)
});

// ... (ADMIN PANEL ROUTES remain unchanged) ...

export default router;
