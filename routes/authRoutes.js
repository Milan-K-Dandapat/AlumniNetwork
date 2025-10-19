import express from 'express';
// ✅ FIX: Import the new teacher-specific login functions
import {
    sendOtp,
    verifyOtpAndRegister,
    login,
    forgotPassword,
    resetPassword,
    loginOtpSend,
    loginOtpVerify,

    // TEACHER REGISTRATION CONTROLLERS
    sendOtpTeacher,
    verifyOtpAndRegisterTeacher,

    // ✅ FIX: Import the new passwordless login functions for teachers
    loginOtpSendTeacher,
    loginOtpVerifyTeacher
} from '../controllers/authController.js';

const router = express.Router();

// ----------------------------------------
// --- REGISTRATION ROUTES (STUDENT/ALUMNI) ---
// ----------------------------------------
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtpAndRegister);

// ----------------------------------------
// --- REGISTRATION ROUTES (TEACHER/FACULTY) ---
// ----------------------------------------
router.post('/send-otp-teacher', sendOtpTeacher);
router.post('/verify-otp-teacher', verifyOtpAndRegisterTeacher);

// ----------------------------------------
// --- TRADITIONAL LOGIN AND PASSWORD RESET ROUTES ---
// ----------------------------------------
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// ----------------------------------------
// --- PASSWORDLESS OTP LOGIN ROUTES ---
// ----------------------------------------

// --- Student / Alumni Login ---
router.post('/login-otp-send', loginOtpSend);
router.post('/login-otp-verify', loginOtpVerify);

// --- ✅ FIX: Add Teacher / Faculty Specific Login Routes ---
router.post('/login-otp-send-teacher', loginOtpSendTeacher);
router.post('/login-otp-verify-teacher', loginOtpVerifyTeacher);


export default router;
