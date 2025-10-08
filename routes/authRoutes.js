import express from 'express';
// You MUST add the two new passwordless login functions to this import
import { 
    sendOtp, 
    verifyOtpAndRegister, 
    login, 
    forgotPassword, 
    resetPassword,
    // --- NEW PASSWORDLESS OTP LOGIN CONTROLLERS ---
    loginOtpSend, 
    loginOtpVerify 
} from '../controllers/authController.js';

const router = express.Router();

// ----------------------------------------
// --- REGISTRATION ROUTES (Existing) ---
// ----------------------------------------
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtpAndRegister);

// ----------------------------------------
// --- TRADITIONAL LOGIN AND PASSWORD RESET ROUTES (Existing) ---
// ----------------------------------------
router.post('/login', login); 
router.post('/forgot-password', forgotPassword); 
router.post('/reset-password', resetPassword); 

// ----------------------------------------
// --- PASSWORDLESS OTP LOGIN ROUTES (The New Feature) ---
// ----------------------------------------

// 1. Frontend sends email/phone to request OTP for login
router.post('/login-otp-send', loginOtpSend);

// 2. Frontend sends OTP to verify and get the JWT token
router.post('/login-otp-verify', loginOtpVerify);


export default router;