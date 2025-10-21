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
// --- (*** NEW ***) ---
// We now import your new alumniRoutes file
import alumniRoutes from './routes/alumniRoutes.js';
// -----------------------------------------------------------------
import visitorRoutes from './routes/visitors.js';
import donationRoutes from './routes/donationRoutes.js'; 
import careerProfileRoutes from './routes/careerProfileRoutes.js';
import jobRoutes from './routes/jobRoutes.js'; 
import Event from './models/Event.js'; 
import statsRoutes from './routes/statsRoutes.js';
import sgMail from '@sendgrid/mail'; 

// --- (*** UPDATED ***) ---
// We now import both 'auth' and 'isSuperAdmin' from your middleware
import auth, { isSuperAdmin } from './middleware/auth.js'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

// ... (Rest of configuration is unchanged) ...
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected...'))
    .catch((err) => {
        console.error('❌ FATAL DB ERROR: Check MONGO_URI in .env and Render Secrets.', err);
    });

// ⭐ SENDGRID CONFIGURATION & HELPER (Unchanged) ⭐
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendCongratulationEmail = async (toEmail, userName) => {
    // ... (This function is unchanged) ...
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

cloudinary.config({
// ... (This section is unchanged) ...
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
const razorpay = new Razorpay({
// ... (This section is unchanged) ...
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});
const app = express();
const PORT = process.env.PORT || 5000;
const ALLOWED_ORIGINS = [
// ... (This section is unchanged) ...
    'http://localhost:3000',
    'https://igitmcaalumni.netlify.app',
];
const NETLIFY_PREVIEW_REGEX = /\.netlify\.app$/;
app.use(cors({
// ... (This section is unchanged) ...
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true })); 
const server = http.createServer(app);
const io = new Server(server, {
// ... (This section is unchanged) ...
    cors: {
        origin: (origin, callback) => {
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
app.use((req, res, next) => {
// ... (This section is unchanged) ...
    req.io = io;
    next();
});
// ... (All socket.io helper functions are unchanged) ...
const getUpdatedEvents = async (userId) => {
// ... (This function is unchanged) ...
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
// ... (This function is unchanged) ...
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
// ... (This function is unchanged) ...
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
app.use('/api/teachers', teacherRoutes); // <-- This is correct
// --- (*** NEW ***) ---
// We now tell Express to use your new alumniRoutes file
app.use('/api/alumni', alumniRoutes);
// ---------------------
app.use('/api/visitors', visitorRoutes);
app.use('/api/donate', donationRoutes); 
app.use('/api/career-profile', careerProfileRoutes);
app.use('/api/jobs', jobRoutes); 
app.use('/api/stats', statsRoutes);
// ---------------

// --- (*** REMOVED ***) ---
// The old 'isSuperAdmin' function was here.
// It is now correctly imported from '/middleware/auth.js'
// ------------------------------------


// --- (*** REMOVED ***) ---
// The old, inline '/api/alumni' routes were here.
// They are now correctly handled by your '/routes/alumniRoutes.js' file,
// which uses the correct controllers and new security logic.
// ------------------------------------

// --- (*** REMOVED ***) ---
// The old, inline '/api/teachers/:id/verify' route was here.
// This is now correctly handled by your '/routes/teacherRoutes.js' file.
// ------------------------------------


// --- (*** NEW ***) ---
// These are the new routes for your Admin Management page
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
// --- END NEW ADMIN ROUTES ---


// --- OTHER ROUTES (Unchanged) ---
app.get('/api/total-users', async (req, res) => {
// ... (This function is unchanged) ...
    try {
        const alumniCount = await Alumni.countDocuments({ isVerified: true });
        const teacherCount = await Teacher.countDocuments({ isVerified: true });
        const totalCount = alumniCount + teacherCount;
        res.json({ count: totalCount });
    } catch (error) {
        res.status(500).json({ message: 'Server Error getting user count' });
    }
});

// ... (Rest of Payment Routes and server listen are unchanged) ...
app.post('/api/register-free-event', async (req, res) => {
// ... (This function is unchanged) ...
    try {
        const registrationData = req.body;
        const userId = registrationData.userId; 

        const newFreeRegistration = new RegistrationPayment({
            ...registrationData,
            razorpay_order_id: `free_event_${new Date().getTime()}`,
            paymentStatus: 'success',
        });

        await newFreeRegistration.save();

        if (req.io && userId) {
            const updatedEventsList = await getUpdatedEvents(userId);
            req.io.emit(`eventsUpdated:${userId}`, updatedEventsList);
            console.log(`--- Socket.IO: Emitted eventsUpdated:${userId} (Free Reg) ---`);
        }

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
// ... (This function is unchanged) ...
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
// ... (This function is unchanged) ...
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, isDonation } = req.body;
        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            
            if (isDonation) {
                const updatedDonation = await Donation.findOneAndUpdate(
                    { razorpay_order_id },
                    { razorpay_payment_id, razorpay_signature, status: 'successful' },
                    { new: true }
                );
                if (req.io && userId) {
                    const totalContribution = await getUpdatedContributions(userId);
                    const globalTotal = await getTotalDonationAmount();
                    req.io.emit(`donationsUpdated:${userId}`, { totalContribution });
                    req.io.emit('globalDonationTotal', { globalTotal }); 
                    console.log(`--- Socket.IO: Emitted donationsUpdated:${userId} and globalTotal (Donation) ---`);
                }
            } else {
                const updatedRegistration = await RegistrationPayment.findOneAndUpdate(
                    { razorpay_order_id },
                    {
                        razorpay_payment_id,
                        razorpay_signature,
                        paymentStatus: 'success',
                    },
                    { new: true }
                );
                
                if (req.io && updatedRegistration && updatedRegistration.userId) {
                    const userId = updatedRegistration.userId; 
                    const updatedEventsList = await getUpdatedEvents(userId);
                    req.io.emit(`eventsUpdated:${userId}`, updatedEventsList);
                    console.log(`--- Socket.IO: Emitted eventsUpdated:${userId} (Paid Reg) ---`);
                }
            }

            res.json({ status: 'success', orderId: razorpay_order_id });
        } else {
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
// --- End Payment Routes ---

app.get('/', (req, res) => {
    res.send('Alumni Network API is running and accessible.');
});

// Socket.io connection (Unchanged)
io.on('connection', (socket) => {
    console.log('✅ A user connected via WebSocket');
    socket.on('disconnect', () => {
        console.log('❌ User disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`)
});