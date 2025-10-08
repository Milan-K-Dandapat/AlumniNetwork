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

// --- Load dotenv immediately & define file paths ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); 
dotenv.config({ path: path.join(__dirname, '.env') });

// --- Configure Cloudinary ---
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

// --- Configure Razorpay --- 
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import galleryRoutes from './routes/galleryRoutes.js';
import contactRoutes from './routes/contact.route.js';

import Alumni from './models/Alumni.js';
import RegistrationPayment from './models/RegistrationPayment.js'; 

// --- VERIFY JWT SECRET IS LOADED ---
if (!process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined in .env file');
    process.exit(1); // Exit the process with an error code
}
console.log('JWT Secret is loaded.'); 

connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

app.use(cors());
app.use(express.json());

// Middleware to make 'io' accessible in routes
app.use((req, res, next) => {
    req.io = io;
    next();
});

// --- API ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/contact', contactRoutes);

// Route to get ONLY VERIFIED alumni for the directory
app.get('/api/alumni', async (req, res) => {
    try {
        const alumni = await Alumni.find({ isVerified: true }).sort({ createdAt: -1 });
        res.json(alumni);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// Route for initial follower count
app.get('/api/total-users', async (req, res) => {
    try {
        const userCount = await Alumni.countDocuments({ isVerified: true });
        res.json({ count: userCount });
    } catch (error) {
        res.status(500).json({ message: 'Server Error getting user count' });
    }
});

// --- NEW ENDPOINT for FREE Event Registration ---
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


// --- START: NEW DONATION ENDPOINT ---
app.post('/api/donate/create-order', async (req, res) => {
    const { amount } = req.body;

    // Validate the amount
    if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ message: 'Please provide a valid amount.' });
    }

    const options = {
        amount: Math.round(amount * 100), // Amount in paise
        currency: 'INR',
        receipt: `receipt_donation_${new Date().getTime()}`,
    };

    try {
        const order = await razorpay.orders.create(options);
        if (!order) {
            return res.status(500).send('Error creating Razorpay order.');
        }
        // NOTE: We don't save a donation model here, just create the order
        res.status(201).json(order);
    } catch (error) {
        console.error('Error creating Razorpay donation order:', error);
        res.status(500).send('Server Error');
    }
});
// --- END: NEW DONATION ENDPOINT ---


// --- RAZORPAY PAYMENT ROUTES (For Event Registration) --- 
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


// --- SERVE FRONTEND IN PRODUCTION ---
if (process.env.NODE_ENV === 'production') {
    // Correctly resolve the path to the client's build directory
    const clientBuildPath = path.join(__dirname, '../client/build');
    
    // Set the static folder for the built React app
    app.use(express.static(clientBuildPath));
  
    // --- ✅ FIX: Changed the catch-all route to prevent crash on Render ---
    // For any route that is not an API route, send back the main index.html file
    app.get('/*', (req, res) => {
      res.sendFile(path.resolve(clientBuildPath, 'index.html'));
    });
}


// Socket.io connection logic
io.on('connection', (socket) => {
    console.log('✅ A user connected via WebSocket');
    socket.on('disconnect', () => {
        console.log('❌ User disconnected');
    });
});

server.listen(process.env.PORT, () => {
    console.log(`🚀 Server is running on port ${process.env.PORT}`)
});

