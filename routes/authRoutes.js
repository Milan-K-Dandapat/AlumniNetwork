import express from 'express';
import {
    // Registration Controllers
    sendOtp,
    verifyOtpAndRegister,
    sendOtpTeacher,
    verifyOtpAndRegisterTeacher,

    // Unified Login Controllers (The Fix)
    loginOtpSend,
    loginOtpVerify,

    // Legacy & Password Reset Controllers
    login,
    forgotPassword,
    resetPassword,
} from '../controllers/authController.js';

const router = express.Router();

// --- REGISTRATION ROUTES (These remain separate) ---
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtpAndRegister);
router.post('/send-otp-teacher', sendOtpTeacher);
router.post('/verify-otp-teacher', verifyOtpAndRegisterTeacher);


// --- ⭐ UNIFIED PASSWORDLESS OTP LOGIN ROUTES (CORRECTED) ⭐ ---
// One route now handles both 'student' and 'teacher' roles.
// The controller will look at the 'role' field in the request body.
router.post('/login-otp-send', loginOtpSend);
router.post('/login-otp-verify', loginOtpVerify);


// --- TRADITIONAL LOGIN AND PASSWORD RESET ROUTES ---
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;