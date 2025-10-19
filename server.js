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
import sgMail from '@sendgrid/mail'; // ⭐ Ensure SendGrid is imported here
import auth from './middleware/auth.js'; 

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

// ⭐ SENDGRID CONFIGURATION & HELPER (Re-integrated from authController context) ⭐
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendCongratulationEmail = async (toEmail, userName) => {
    const fromEmail = 'mcaigitalumni@gmail.com'; // ⭐ Set the required sender email
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
    req.io = io;
    next();
});
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
// =========================================================================

if (!process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined.');
    process.exit(1);
}
console.log('JWT Secret is loaded.');

// --- ROUTING (Unchanged) ---
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/donate', donationRoutes); 
app.use('/api/career-profile', careerProfileRoutes);
app.use('/api/jobs', jobRoutes); 
app.use('/api/stats', statsRoutes);
// ---------------

// --- ADMIN VERIFICATION SETUP (Unchanged) ---
const SUPER_ADMIN_EMAIL = 'milankumar7770@gmail.com'; 

const isSuperAdmin = (req, res, next) => {
    if (!req.user || req.user.email !== SUPER_ADMIN_EMAIL) {
        return res.status(403).json({ message: 'Forbidden: Admin access required.' });
    }
    next();
};
// ------------------------------------


// --- ALUMNI ROUTES (UPDATED) ---
app.get('/api/alumni', auth, async (req, res) => {
    try {
        const alumni = await Alumni.find({}).sort({ createdAt: -1 }); 
        res.json(alumni);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

app.patch('/api/alumni/:id/verify', auth, isSuperAdmin, async (req, res) => {
    try {
        const alumnus = await Alumni.findById(req.params.id);

        if (!alumnus) {
            return res.status(404).json({ message: 'Alumnus not found' });
        }
        
        // ⭐ CRITICAL CHECK: Only send email if they are currently unverified 
        const wasUnverified = !alumnus.isVerified;

        alumnus.isVerified = true;
        await alumnus.save();

        // ⭐ ACTION: Send congratulation email after successful verification ⭐
        if (wasUnverified) {
            await sendCongratulationEmail(alumnus.email, alumnus.fullName);
        }
        // ⭐ END ACTION ⭐

        res.json(alumnus); 

    } catch (error) {
        console.error('Error verifying alumnus:', error);
        if (error.kind === 'ObjectId') {
             return res.status(400).json({ message: 'Invalid Alumnus ID format' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
});
// ------------------------------------

// --- TEACHER VERIFICATION ROUTE (UPDATED) ---
app.patch('/api/teachers/:id/verify', auth, isSuperAdmin, async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id);

        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }
        
        // ⭐ CRITICAL CHECK: Only send email if they are currently unverified 
        const wasUnverified = !teacher.isVerified;

        teacher.isVerified = true;
        await teacher.save();
        
        // ⭐ ACTION: Send congratulation email after successful verification ⭐
        if (wasUnverified) {
            await sendCongratulationEmail(teacher.email, teacher.fullName);
        }
        // ⭐ END ACTION ⭐

        res.json(teacher); // Send back the updated teacher data

    } catch (error) {
        console.error('Error verifying teacher:', error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid Teacher ID format' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
});
// --- END TEACHER VERIFICATION ROUTE ---


// --- OTHER ROUTES (Unchanged) ---
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

// ... (Rest of Payment Routes and server listen are unchanged) ...
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
