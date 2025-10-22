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
import alumniRoutes from './routes/alumniRoutes.js';
import visitorRoutes from './routes/visitors.js';
import donationRoutes from './routes/donationRoutes.js'; 
import careerProfileRoutes from './routes/careerProfileRoutes.js';
import jobRoutes from './routes/jobRoutes.js'; 
import Event from './models/Event.js'; 
import statsRoutes from './routes/statsRoutes.js';
import sgMail from '@sendgrid/mail'; 

// Import your auth middleware
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
    });

// --- SendGrid Configuration ---
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendCongratulationEmail = async (toEmail, userName) => {
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
        if (!origin) return callback(null, true); // Allow requests with no origin (like Postman)
        if (origin.startsWith('http://localhost:')) {
            return callback(null, true); // Allow all localhost ports
        } 
        if (ALLOWED_ORIGINS.includes(origin) || NETLIFY_PREVIEW_REGEX.test(new URL(origin).hostname)) {
            callback(null, true); // Allow allowed origins and Netlify previews
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
            if (ALLOWED_ORIGINS.includes(origin) || NETLIFY_PREVIEW_REGEX.test(new URL(origin).hostname)) {
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

// --- Socket.io Helper Functions ---
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
// --- API ROUTING ---
// =========================================================================

// All routes imported from /routes files
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/events', eventRoutes); // This is correct! It's public.
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

// --- Admin User Management Routes (Super Admin Only) ---
/**
 * @route   GET /api/users/all
 * @desc    Get all users (alumni & teachers) for the admin panel
 * @access  Private (Super Admin Only)
 */
app.get('/api/users/all', auth, isSuperAdmin, async (req, res) => {
    try {
        const alumni = await Alumni.find().select('fullName email role alumniCode isVerified');
        const teachers = await Teacher.find().select('fullName email role teacherCode isVerified');
        const allUsers = [...alumni, ...teachers];
        
        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'milankumar7770@gmail.com';
        // Filter out the super admin from the list
        const filteredUsers = allUsers.filter(u => u.email !== superAdminEmail);
        
        res.json(filteredUsers.sort((a, b) => a.fullName.localeCompare(b.fullName)));
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

/**
 * @route   PATCH /api/users/:id/role
 * @desc    Update a user's role (to 'admin' or 'user')
 * @access  Private (Super Admin Only)
 */
app.patch('/api/users/:id/role', auth, isSuperAdmin, async (req, res) => {
    const { role } = req.body;
    const { id } = req.params;

    if (!role || (role !== 'admin' && role !== 'user')) {
        return res.status(400).json({ msg: 'Invalid role specified.' });
    }

    try {
        // Try updating in Alumni collection first
        let user = await Alumni.findByIdAndUpdate(
            id, 
            { $set: { role: role } }, 
            { new: true, select: 'fullName email role alumniCode teacherCode' }
        );

        // If not found in Alumni, try in Teacher collection
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

        res.json(user); // Send back the updated user
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

// --- (*** CLEANED UP ***) ---
// Removed redundant payment routes (/api/register-free-event, /api/create-order, /api/verify-payment)
// These are now correctly handled by your '/api/events' router (eventRoutes.js).
// -----------------------------


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