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
// Import Models (ensure all needed models are imported)
import Event from './models/Event.js'; 

// Import Routes
import eventRoutes from './routes/eventRoutes.js';
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import galleryRoutes from './routes/galleryRoutes.js';
import contactRoutes from './routes/contact.route.js';
import projectRoutes from './routes/projectRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import alumniRoutes from './routes/alumniRoutes.js';
import visitorRoutes from './routes/visitors.js';
import donationRoutes from './routes/donationRoutes.js'; 
import careerProfileRoutes from './routes/careerProfileRoutes.js';
import jobRoutes from './routes/jobRoutes.js'; 
import statsRoutes from './routes/statsRoutes.js';
// 💡 CRITICAL CHANGE: Import the adminRoutes file to map all admin logic
import adminRoutes from './routes/adminRoutes.js'; 

import sgMail from '@sendgrid/mail'; 

// Import your auth middleware (kept for reference, but main auth usage moves to routers)
import auth, { isSuperAdmin } from './middleware/auth.js'; 

// --- Initial Setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

// --- MongoDB Connection ---
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected...'))
    .catch((err) => {
        console.error('❌ FATAL DB ERROR: Check MONGO_URI in .env and Render Secrets.', err);
        process.exit(1); // Exit on critical database failure
    });

// --- SendGrid Configuration (Keep as general helper) ---
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendCongratulationEmail = async (toEmail, userName) => {
    // ... (Email logic remains unchanged, kept for context) ...
    const fromEmail = 'mcaigitalumni@gmail.com'; 
    const subject = '🎉 Congratulations! Your Alumni Account is Verified!';
    const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #28a745;">Congratulations, ${userName}!</h2>
            <p>We are excited to inform you that your **IGIT MCA Alumni Network** account has been successfully verified and activated by the administrator.</p>
            <p>You now have full access to our community features, including the Career Network and Directory.</p>
            <p style="margin-top: 20px;">
                <strong>Next Step:</strong> Please log in and start exploring our community!
            </p>
            <p>Thank you for being a part of our network.</p>
            <p style="font-size: 0.9em; color: #777;">Best regards,</p>
            <p style="font-size: 0.9em; color: #777;">The IGIT MCA Alumni Team</p>
        </div>
    `;

    const msg = { from: fromEmail, to: toEmail, subject: subject, html: html };
    
    try {
        await sgMail.send(msg);
        console.log(`✅ Verification email sent to: ${toEmail}`);
    } catch (error) {
        console.error(`❌ Failed to send verification email to ${toEmail}:`, error.message);
    }
};

// --- Cloudinary & Razorpay Config ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// --- Express & CORS Setup ---
const app = express();
const PORT = process.env.PORT || 5000;
const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'https://igitmcaalumni.netlify.app',
];
const NETLIFY_PREVIEW_REGEX = /\.netlify\.app$/;

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true); 
        if (origin.startsWith('http://localhost:')) {
            return callback(null, true); 
        } 
        const urlHost = new URL(origin).hostname;
        if (ALLOWED_ORIGINS.includes(origin) || NETLIFY_PREVIEW_REGEX.test(urlHost)) {
            callback(null, true); 
        } else {
            console.error(`❌ CORS blocked for origin: ${origin}`);
            callback(new Error('Not allowed by CORS'), false);
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true })); 

// --- HTTP & Socket.io Server ---
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (!origin || origin.startsWith('http://localhost:')) {
                return callback(null, true);
            }
            const urlHost = new URL(origin).hostname;
            if (ALLOWED_ORIGINS.includes(origin) || NETLIFY_PREVIEW_REGEX.test(urlHost)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'), false);
            }
        },
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        credentials: true
    }
});

// Middleware to attach socket.io to requests
app.use((req, res, next) => {
    req.io = io;
    next();
});

// --- Socket.io Helper Functions (Kept for completeness, no direct change needed) ---
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

// --- JWT Sanity Check ---
if (!process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined.');
    process.exit(1);
}
console.log('JWT Secret is loaded.');

// =========================================================================
// 💡 API ROUTING - MAPPING ALL ROUTE FILES (Existing Routes)
// =========================================================================

// General Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/events', eventRoutes); 
app.use('/api/gallery', galleryRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/alumni', alumniRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/donate', donationRoutes); 
app.use('/api/career-profile', careerProfileRoutes);
app.use('/api/jobs', jobRoutes); 
app.use('/api/stats', statsRoutes);

// Admin Routes
app.use('/api/admin', adminRoutes); 

// =========================================================================
// 🚀 FIX: NEW EVENT REGISTRATION ROUTES (Resolves 404 from frontend)
// These routes handle the submission logic from EventRegistrationPage.js.
// =========================================================================

// POST /api/register-free-event - Handles event registration when amount is <= 0
// POST /api/register-free-event - Handles event registration when amount is <= 0
app.post('/api/register-free-event', async (req, res) => {
    try {
        // Destructure all fields from the request body
        const { eventId, fullName, email, mobile, batch, purpose, guestCount, tShirtCount, tShirtSize, vegCount, nonVegCount, state, district, gender, designation } = req.body;

        // Basic validation
        if (!eventId || !email || !fullName || !mobile) {
            return res.status(400).json({ message: 'Missing essential registration details.' });
        }

        // Check for duplicate registration
        const existingRegistration = await RegistrationPayment.findOne({ 
            eventId: eventId, 
            email: email, 
            paymentStatus: { $in: ['success', 'free'] } 
        });

        if (existingRegistration) {
            return res.status(409).json({ message: 'You are already registered for this event.' });
        }

        // 1. Create a new RegistrationPayment entry with 'free' status
        const registration = new RegistrationPayment({
            eventId,
            eventTitle: purpose, // Map purpose to eventTitle for schema
            fullName,
            email,
            mobile,
            batch,
            // Include other non-payment related user fields
            state, 
            district, 
            gender, 
            designation,
            guestCount, 
            tShirtCount, 
            tShirtSize, 
            vegCount, 
            nonVegCount,
            donation: req.body.donation, // Ensure donation is saved
            
            amount: 0,
            paymentStatus: 'free', 

            // 🛑 FIX: The custom paymentDetails object is now correctly used here.
            paymentDetails: {
                orderId: 'FREE_REGISTRATION', 
                paymentId: 'N/A',
                signature: 'N/A',
            },
        });
        
        await registration.save();
        
        // 2. Send success response
        res.status(201).json({ 
            message: 'Free registration successful.',
            registrationId: registration._id 
        });

    } catch (error) {
        console.error('Error during free registration:', error);
        
        // Check for Mongoose Validation Error (for required fields like district or batch)
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: `Validation Failed: ${messages.join(', ')}` });
        }

        res.status(500).json({ message: 'Server error during free registration. Check backend console for details.', error: error.message });
    }
});

// POST /api/create-order - Initiates a Razorpay order for paid events
// POST /api/create-order - Initiates a Razorpay order for paid events
app.post('/api/create-order', async (req, res) => {
    try {
        // 1. Destructure all fields from the request body (ensuring all schema fields are captured)
        const { 
            amount, eventId, fullName, email, mobile, batch, purpose, 
            guestCount, tShirtCount, tShirtSize, vegCount, nonVegCount, 
            donation, state, district, gender, designation 
        } = req.body;
        
        if (!amount || amount <= 0) {
             // This condition should prevent a 500 but should lead to a client-side error.
             return res.status(400).json({ message: 'Amount is invalid or missing for payment order.' });
        }
        
        // Convert amount from Rupees to Paisa (Razorpay requirement)
        const orderAmountInPaisa = Math.round(amount * 100); 

        const options = {
            amount: orderAmountInPaisa,
            currency: 'INR',
            receipt: `receipt_${Date.now()}_${eventId}`,
            payment_capture: 1, 
        };

        // 2. Create the Razorpay Order
        const razorpayOrder = await razorpay.orders.create(options);

        // 3. Create a pending RegistrationPayment entry
        const registration = new RegistrationPayment({
            eventId,
            eventTitle: purpose, // Map purpose to eventTitle for schema
            userId: null, 
            fullName,
            email,
            mobile,
            batch,
            state, 
            district, 
            gender, 
            designation,

            guestCount, 
            tShirtCount, 
            tShirtSize, 
            vegCount, 
            nonVegCount,
            donation, // Included donation field
            
            amount,
            paymentStatus: 'pending',

            // Razorpay IDs
            razorpay_order_id: razorpayOrder.id, // Direct map to schema field

            // Custom payment details object (for reference)
            paymentDetails: {
                orderId: razorpayOrder.id,
                paymentId: 'N/A',
                signature: 'N/A',
            },
        });

        await registration.save();

        // 4. Send order details back to the frontend
        res.json({
            order: razorpayOrder,
            registrationId: registration._id,
        });

    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        
        // 💡 FIX: Check for Mongoose Validation Error 
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: `Validation Failed (Paid Event): ${messages.join(', ')}` });
        }
        
        res.status(500).json({ message: 'Failed to create payment order. Check backend console for details.', error: error.message });
    }
});

// =========================================================================
// 🛑 End of New Routes 🛑
// =========================================================================

// --- Admin User Management Routes (Placeholder logic remains unchanged) ---
app.get('/api/users/all', auth, isSuperAdmin, async (req, res, next) => {
    try {
        const alumni = await Alumni.find().select('fullName email role alumniCode isVerified');
        const teachers = await Teacher.find().select('fullName email role teacherCode isVerified');
        const allUsers = [...alumni, ...teachers];
        
        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'milankumar7770@gmail.com';
        const filteredUsers = allUsers.filter(u => u.email !== superAdminEmail);
        
        res.json(filteredUsers.sort((a, b) => a.fullName.localeCompare(b.fullName)));
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


app.patch('/api/users/:id/role', auth, isSuperAdmin, async (req, res, next) => {
    const { role } = req.body;
    const { id } = req.params;

    if (!role || (role !== 'admin' && role !== 'user')) {
        return res.status(400).json({ msg: 'Invalid role specified.' });
    }

    try {
        let user = await Alumni.findByIdAndUpdate(
            id, 
            { $set: { role: role } }, 
            { new: true, select: 'fullName email role alumniCode teacherCode' }
        );

        if (!user) {
            user = await Teacher.findByIdAndUpdate(
                id, 
                { $set: { role: role } }, 
                { new: true, select: 'fullName email role alumniCode teacherCode' }
            );
        }

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid User ID format' });
        }
        res.status(500).send('Server Error');
    }
});


// --- Other Misc Routes ---
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

// --- Root Health Check ---
app.get('/', (req, res) => {
    res.send('Alumni Network API is running and accessible.');
});


// --- Socket.io Connection Listener ---
io.on('connection', (socket) => {
    console.log('✅ A user connected via WebSocket');
    socket.on('disconnect', () => {
        console.log('❌ User disconnected');
    });
});

// --- Start Server ---
server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`)
});