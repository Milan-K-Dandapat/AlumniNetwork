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
router.get('/events/upcoming', async (req, res) => {
    try {
        const events = await Event.find({ isArchived: false }).sort({ date: 1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
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
router.post('/events', async (req, res) => {
    // NOTE: Apply authentication middleware here
    try {
        const newEvent = new Event(req.body);
        await newEvent.save();
        res.status(201).json(newEvent);
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ message: 'Failed to create event.' });
    }
});

/**
 * @route   GET /api/admin/registered-events
 * @desc    Get a list of unique events that have successful registrations
 * @access  Private/Admin
 */
router.get('/admin/registered-events', async (req, res) => {
    // NOTE: Apply authentication middleware here
    try {
        // Use aggregation to find unique event IDs and their titles from successful payments
        const registeredEvents = await RegistrationPayment.aggregate([
            // 1. Filter only successful payments
            { $match: { paymentStatus: 'success' } },
            
            // 2. Group by eventId and eventTitle to get unique combinations
            {
                $group: {
                    _id: '$eventId',
                    eventTitle: { $first: '$eventTitle' }, // Grab the first title found for the group
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
 * @desc    Get all successful registrations for a specific event (ADMIN)
 * @access  Private/Admin
 */
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

// NOTE: The old GET /api/admin/events route is removed as it is no longer necessary 
// for the Registration tab's purpose.

export default router;