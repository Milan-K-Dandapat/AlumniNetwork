import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { Server } from 'socket.io';
import { v2 as cloudinary } from 'cloudinary';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import mongoose from 'mongoose';
import Alumni from './models/Alumni.js';
import Teacher from './models/Teacher.js';
import RegistrationPayment from './models/RegistrationPayment.js';
import Donation from './models/Donation.js';
// Import Routes
import eventRoutes from './routes/eventRoutes.js';
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import galleryRoutes from './routes/galleryRoutes.js';
import contactRoutes from './routes/contact.route.js';
import projectRoutes from './routes/projectRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import visitorRoutes from './routes/visitors.js';
import donationRoutes from './routes/donationRoutes.js'; 
import careerProfileRoutes from './routes/careerProfileRoutes.js';
import jobRoutes from './routes/jobRoutes.js'; 
import Event from './models/Event.js'; 
import statsRoutes from './routes/statsRoutes.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

// --- MONGODB CONNECTION ---
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected...'))
    .catch((err) => {
        console.error('❌ FATAL DB ERROR: Check MONGO_URI in .env and Render Secrets.', err);
    });

// --- CLOUDINARY CONFIGURATION ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const app = express();
const PORT = process.env.PORT || 5000;

// =========================================================================
//                           CORS Configuration (Main Express)
// =========================================================================

const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    // Remove the direct localhost:${PORT} entry here, as the check below handles it more robustly
    'https://igitmcaalumni.netlify.app',
];

const NETLIFY_PREVIEW_REGEX = /\.netlify\.app$/;

app.use(cors({
    origin: (origin, callback) => {
        // --- CRITICAL REFINEMENT: BULLETPROOF LOCALHOST/INTERNAL CHECK ---
        // 1. Allow if no origin (internal requests)
        if (!origin) return callback(null, true);
        
        // 2. Allow if origin starts with http://localhost (handles any local port)
        if (origin.startsWith('http://localhost:')) {
            return callback(null, true);
        } 

        if (ALLOWED_ORIGINS.includes(origin) || NETLIFY_PREVIEW_REGEX.test(origin)) {
            callback(null, true);
        } else {
            console.error(`❌ CORS blocked for origin: ${origin}`);
            callback(new Error('Not allowed by CORS'), false);
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true
}));

// --- CRITICAL MIDDLEWARE SETUP ---
// Middleware for JSON bodies 
app.use(express.json({ limit: '10mb' }));

// Middleware for URL-encoded bodies 
app.use(express.urlencoded({ extended: true })); 
// --- END CRITICAL MIDDLEWARE SETUP ---

const server = http.createServer(app);

// =========================================================================
//                           Socket.io with CORS (CRITICAL FIX)
// =========================================================================
const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            // 🚨 FIX: Apply the same bulletproof check here
            if (!origin || origin.startsWith('http://localhost:')) {
                return callback(null, true);
            }
            
            if (ALLOWED_ORIGINS.includes(origin) || NETLIFY_PREVIEW_REGEX.test(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'), false);
            }
        },
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        credentials: true
    }
});

// ✅ Attach io to req for real-time usage in controllers
app.use((req, res, next) => {
    req.io = io;
    next();
});

// ========================================================================
// --- HELPER FUNCTIONS FOR SOCKET EMISSION ---
// ========================================================================

// Helper 1: For Event Registration Updates
const getUpdatedEvents = async (userId) => {
    try {
        const registrations = await RegistrationPayment.find({ 
            userId: userId, 
            paymentStatus: 'success' 
        })
        .select('eventId')
        .populate({
            path: 'eventId',
            model: 'Event', 
            select: 'title date'
        })
        .lean()
        .exec();
        
        return registrations.map(reg => ({
            id: reg.eventId._id, 
            name: reg.eventId.title,
            date: reg.eventId.date
        }));
    } catch (e) {
        console.error("Error fetching updated event list:", e);
        return [];
    }
};

// Helper 2: For Total Contribution Updates 
const getUpdatedContributions = async (userId) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) return 0;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    try {
        const totalResult = await Donation.aggregate([
            { $match: { userId: userObjectId, status: 'successful' } }, 
            { $project: { amount: { $toDouble: "$amount" } } }, 
            { $group: { _id: '$userId', totalAmount: { $sum: '$amount' } } }
        ]);
        return totalResult.length > 0 ? totalResult[0].totalAmount : 0;
    } catch (e) {
        console.error("Error fetching updated contribution total:", e);
        return 0;
    }
};
// Helper 3: For Total Donation Amount (Used globally, e.g., on dashboard)
const getTotalDonationAmount = async () => {
    try {
        const totalResult = await Donation.aggregate([
            { $match: { status: 'successful' } }, 
            { $project: { amount: { $toDouble: "$amount" } } }, 
            { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
        ]);
        return totalResult.length > 0 ? totalResult[0].totalAmount : 0;
    } catch (e) {
        console.error("Error fetching total donation amount:", e);
        return 0;
    }
};

// =========================================================================

if (!process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined.');
    process.exit(1);
}
console.log('JWT Secret is loaded.');

// --- ROUTING ---
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/donate', donationRoutes); 
// ⬅️ NEW ROUTES
app.use('/api/career-profile', careerProfileRoutes);
app.use('/api/jobs', jobRoutes); // ✅ ROUTE IS CORRECTLY REGISTERED
app.use('/api/stats', statsRoutes);
// ---------------

// Existing route for fetching verified ALUMNI/STUDENTS
app.get('/api/alumni', async (req, res) => {
    try {
        const alumni = await Alumni.find({ isVerified: true }).sort({ createdAt: -1 });
        res.json(alumni);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// OPTIONAL UPDATE: Update total user count to include both models
app.get('/api/total-users', async (req, res) => {
    try {
        const alumniCount = await Alumni.countDocuments({ isVerified: true });
        const teacherCount = await Teacher.countDocuments({ isVerified: true });
        const totalCount = alumniCount + teacherCount;
        res.json({ count: totalCount });
    } catch (error) {
        res.status(500).json({ message: 'Server Error getting user count' });
    }
});

// --- Inlined Payment Routes (Events/Registration) ---

app.post('/api/register-free-event', async (req, res) => {
    try {
        const registrationData = req.body;
        const userId = registrationData.userId; 

        const newFreeRegistration = new RegistrationPayment({
            ...registrationData,
            razorpay_order_id: `free_event_${new Date().getTime()}`,
            paymentStatus: 'success',
        });

        await newFreeRegistration.save();

        // 🚀 CRITICAL: Emit WebSocket event for free registration
        if (req.io && userId) {
            const updatedEventsList = await getUpdatedEvents(userId);
            req.io.emit(`eventsUpdated:${userId}`, updatedEventsList);
            console.log(`--- Socket.IO: Emitted eventsUpdated:${userId} (Free Reg) ---`);
        }
        // ----------------------------------------------------

        res.status(201).json({
            status: 'success',
            message: 'Free registration successful',
            registrationId: newFreeRegistration._id
        });

    } catch (error) {
        console.error("Error in /api/register-free-event:", error);
        res.status(500).json({ message: 'Server error during free registration.' });
    }
});

app.post('/api/create-order', async (req, res) => {
    try {
        const { amount, ...registrationData } = req.body;

        const options = {
            amount: Number(amount) * 100,
            currency: "INR",
            receipt: `receipt_order_${new Date().getTime()}`,
        };

        const order = await razorpay.orders.create(options);

        const newPaymentRegistration = new RegistrationPayment({
            ...registrationData,
            amount,
            razorpay_order_id: order.id,
            paymentStatus: 'created',
        });

        await newPaymentRegistration.save();

        res.json({ order, registrationId: newPaymentRegistration._id });

    } catch (error) {
        console.error("Error in /api/create-order:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.post('/api/verify-payment', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, isDonation } = req.body; // Capture userId and isDonation flag
        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            
            if (isDonation) {
                // Handle Donation
                const updatedDonation = await Donation.findOneAndUpdate(
                    { razorpay_order_id },
                    { razorpay_payment_id, razorpay_signature, status: 'successful' },
                    { new: true }
                );
                // 🚀 Emit WebSocket event for donation totals
                if (req.io && userId) {
                    const totalContribution = await getUpdatedContributions(userId);
                    const globalTotal = await getTotalDonationAmount();
                    req.io.emit(`donationsUpdated:${userId}`, { totalContribution });
                    req.io.emit('globalDonationTotal', { globalTotal }); 
                    console.log(`--- Socket.IO: Emitted donationsUpdated:${userId} and globalTotal (Donation) ---`);
                }
            } else {
                // Handle Event Registration
                const updatedRegistration = await RegistrationPayment.findOneAndUpdate(
                    { razorpay_order_id },
                    {
                        razorpay_payment_id,
                        razorpay_signature,
                        paymentStatus: 'success',
                    },
                    { new: true } // Return the updated document
                );
                
                // 🚀 Emit WebSocket event for paid registration
                if (req.io && updatedRegistration && updatedRegistration.userId) {
                    const userId = updatedRegistration.userId; 
                    const updatedEventsList = await getUpdatedEvents(userId);
                    req.io.emit(`eventsUpdated:${userId}`, updatedEventsList);
                    console.log(`--- Socket.IO: Emitted eventsUpdated:${userId} (Paid Reg) ---`);
                }
            }

            res.json({ status: 'success', orderId: razorpay_order_id });
        } else {
            // Failed payment handling (affects both registration and donation)
            if (isDonation) {
                await Donation.findOneAndUpdate({ razorpay_order_id }, { status: 'failed' });
            } else {
                await RegistrationPayment.findOneAndUpdate({ razorpay_order_id }, { paymentStatus: 'failed' });
            }
            res.status(400).json({ status: 'failure' });
        }
    } catch (error) {
        console.error("Error in /api/verify-payment:", error);
        res.status(500).send("Internal Server Error");
    }
});

// --- End Inlined Payment Routes ---

app.get('/', (req, res) => {
    res.send('Alumni Network API is running and accessible.');
});

io.on('connection', (socket) => {
    console.log('✅ A user connected via WebSocket');
    socket.on('disconnect', () => {
        console.log('❌ User disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`)
});