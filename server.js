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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); 

dotenv.config({ path: path.join(__dirname, '.env') });

// --- ✅ SECURITY FIX: Revert to using the secure environment variable ---
const MONGO_URI = process.env.MONGO_URI; 

// Connect to MongoDB using the secure environment variable
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected...'))
    .catch((err) => {
        // Log the error prominently and rely on Render environment to be set
        console.error('❌ FATAL DB ERROR: Check MONGO_URI in .env and Render Secrets.', err);
        // Do not throw here, allow the app to initialize, but log the error prominently
    });
// -------------------------------------------------------------------------

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
//                  CORS FIX: Define Allowed Origins
// =========================================================================

// Define all origins that are allowed to access this API
const ALLOWED_ORIGINS = [
    'https://igitmcaalumni.netlify.app',
    'http://localhost:3000', 
];

const server = http.createServer(app);

// 1. Socket.io CORS Configuration
const io = new Server(server, {
    cors: {
        origin: ALLOWED_ORIGINS, 
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
});

// 2. Express Middleware CORS Configuration
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        
        if (ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            console.error(`❌ CORS blocked for origin: ${origin}`);
            callback(new Error('Not allowed by CORS'), false);
        }
    },
    credentials: true
}));
// =========================================================================

app.use(express.json());

app.use((req, res, next) => {
    req.io = io;
    next();
});

// Assuming Alumni and RegistrationPayment models are defined elsewhere
import Alumni from './models/Alumni.js';
import RegistrationPayment from './models/RegistrationPayment.js'; 

// Check if JWT Secret is present AFTER dotenv loads
if (!process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined.');
    process.exit(1);
}
console.log('JWT Secret is loaded.'); 


// --- ROUTING ---
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import galleryRoutes from './routes/galleryRoutes.js';
import contactRoutes from './routes/contact.route.js';

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/contact', contactRoutes);
// ---------------

app.get('/api/alumni', async (req, res) => {
    try {
        const alumni = await Alumni.find({ isVerified: true }).sort({ createdAt: -1 });
        res.json(alumni);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

app.get('/api/total-users', async (req, res) => {
    try {
        const userCount = await Alumni.countDocuments({ isVerified: true });
        res.json({ count: userCount });
    } catch (error) {
        res.status(500).json({ message: 'Server Error getting user count' });
    }
});

app.post('/api/register-free-event', async (req, res) => {
    try {
        const registrationData = req.body;

        const newFreeRegistration = new RegistrationPayment({
            ...registrationData,
            razorpay_order_id: `free_event_${new Date().getTime()}`,
            paymentStatus: 'success',
        });
        
        await newFreeRegistration.save();

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

app.post('/api/donate/create-order', async (req, res) => {
    const { amount } = req.body;

    if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ message: 'Please provide a valid amount.' });
    }

    const options = {
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt: `receipt_donation_${new Date().getTime()}`,
    };

    try {
        const order = await razorpay.orders.create(options);
        if (!order) {
            return res.status(500).send('Error creating Razorpay order.');
        }
        res.status(201).json(order);
    } catch (error) {
        console.error('Error creating Razorpay donation order:', error);
        res.status(500).send('Server Error');
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
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            await RegistrationPayment.findOneAndUpdate(
                { razorpay_order_id },
                {
                    razorpay_payment_id,
                    razorpay_signature,
                    paymentStatus: 'success',
                }
            );
            res.json({ status: 'success', orderId: razorpay_order_id });
        } else {
            await RegistrationPayment.findOneAndUpdate({ razorpay_order_id }, { paymentStatus: 'failed' });
            res.status(400).json({ status: 'failure' });
        }
    } catch (error) {
        console.error("Error in /api/verify-payment:", error);
        res.status(500).send("Internal Server Error");
    }
});

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