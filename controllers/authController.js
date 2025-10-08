import Alumni from '../models/Alumni.js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
// --- ✅ FIX: Switched from 'bcrypt' to 'bcryptjs' ---
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const OTP_EXPIRY_MINUTES = 10;
// CRITICAL FIX: Get the secret inside the functions where it's needed, 
// using a fallback value to prevent "secretOrPrivateKey must have a value" error 
// if process.env.JWT_SECRET hasn't loaded when the file is imported.
const getSecret = () => process.env.JWT_SECRET || 'a8f5b1e3d7c2a4b6e8d9f0a1b3c5d7e9f2a4b6c8d0e1f3a5b7c9d1e3f5a7b9c1'; // <-- USE YOUR ACTUAL SECRET/FALLBACK


const createTransporter = () => {
    return nodemailer.createTransport({
        // 🚀 CRITICAL FIX: Explicitly set host, port, and security for Render/Gmail
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // Use SSL/TLS for port 465
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

// --- REGISTRATION ---
export const sendOtp = async (req, res) => {
    const transporter = createTransporter();
    const { email, fullName, batch, phoneNumber, company, position } = req.body;

    if (!email || !fullName || !batch || !phoneNumber) {
        return res.status(400).json({ message: 'All required fields must be filled.' });
    }

    try {
        let alumni = await Alumni.findOne({ email });
        if (alumni && alumni.isVerified) {
            return res.status(400).json({ message: 'This email is already registered.' });
        }
        
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000); 
        const alumniData = { fullName, email, phoneNumber, batch, company, position, otp, otpExpires };

        if (alumni) {
            alumni.set(alumniData); 
            await alumni.save();
        } else {
            await Alumni.create(alumniData);
        }
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your AlumniConnect Verification Code',
            html: `<p>Your OTP is: <strong>${otp}</strong>. It is valid for ${OTP_EXPIRY_MINUTES} minutes.</p>`,
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'OTP sent successfully to your email.' });

    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

export const verifyOtpAndRegister = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const alumni = await Alumni.findOne({ 
            email, 
            otp, 
            otpExpires: { $gt: Date.now() } 
        });

        if (!alumni) {
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }

        alumni.isVerified = true;
        alumni.otp = undefined;
        alumni.otpExpires = undefined;
        await alumni.save();
        
        if (req.io) {
            const newUserCount = await Alumni.countDocuments({ isVerified: true });
            req.io.emit('newUserRegistered', newUserCount);
        }

        // Generate token using the secured secret function
        const token = jwt.sign({ id: alumni._id }, getSecret(), { expiresIn: '1d' });

        res.status(201).json({ 
            message: 'Registration successful!', 
            token,
            user: { id: alumni._id, email: alumni.email, fullName: alumni.fullName } 
        });

    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

// --- LOGIN & PASSWORD ---
export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const alumni = await Alumni.findOne({ email }).select('+password');

        if (!alumni || !alumni.password) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }
        if (!alumni.isVerified) {
            return res.status(400).json({ message: 'Account not verified.' });
        }
        
        const isMatch = await bcrypt.compare(password, alumni.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }
        
        // Generate token using the secured secret function
        const token = jwt.sign({ id: alumni._id }, getSecret(), { expiresIn: '1d' });

        res.status(200).json({ 
            message: 'Login successful.',
            token,
            user: { id: alumni._id, email: alumni.email, fullName: alumni.fullName }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

// 2. FORGOT PASSWORD CONTROLLER (POST /api/auth/forgot-password)
export const forgotPassword = async (req, res) => {
    const transporter = createTransporter();
    const { email } = req.body;

    try {
        const alumni = await Alumni.findOne({ email, isVerified: true });

        if (!alumni) {
            // Secure response to prevent email enumeration
            return res.status(200).json({ message: 'If this email is registered, a password reset OTP will be sent.' });
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000); 

        alumni.otp = otp;
        alumni.otpExpires = otpExpires;
        await alumni.save();

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Alumni Password Reset Code',
            html: `<p>Your code to reset your password is: <strong>${otp}</strong>. It is valid for ${OTP_EXPIRY_MINUTES} minutes.</p>`,
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'OTP sent successfully for password reset.' });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Server error. Could not send reset email.' });
    }
};

// 3. RESET PASSWORD CONTROLLER (POST /api/auth/reset-password)
export const resetPassword = async (req, res) => {
    const transporter = createTransporter();
    const { email, otp, newPassword } = req.body;

    try {
        const alumni = await Alumni.findOne({ 
            email, 
            otp, 
            otpExpires: { $gt: Date.now() },
            isVerified: true
        });

        if (!alumni) {
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        alumni.password = hashedPassword;
        alumni.otp = undefined; // Clear OTP fields
        alumni.otpExpires = undefined; 
        
        await alumni.save();

        res.status(200).json({ message: 'Password has been successfully reset. You can now log in.' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error during password reset.' });
    }
};

// ======================================================================
// 3. PASSWORDLESS OTP LOGIN (NEW FEATURE)
// ======================================================================

// 4. LOGIN OTP SEND CONTROLLER (POST /api/auth/login-otp-send)
export const loginOtpSend = async (req, res) => {
    const transporter = createTransporter();
    const { identifier } = req.body; 

    if (!identifier) {
        return res.status(400).json({ message: 'Email or phone number is required.' });
    }

    try {
        // Find user by email OR phone number and ensure they are verified
        const alumni = await Alumni.findOne({ 
            $or: [
                { email: identifier },
                { phoneNumber: identifier }
            ],
            isVerified: true
        });

        if (!alumni) {
            // Use the same error as the frontend was expecting for consistency
            return res.status(404).json({ message: 'Login failed. User not found or service error.' });
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000); 

        // Save the generated OTP and expiry to the user's document
        alumni.otp = otp;
        alumni.otpExpires = otpExpires;
        await alumni.save();

        let deliveryMethod = alumni.email ? 'email' : 'phone number';
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: alumni.email, // Assume we always send to email if it exists
            subject: 'Your Passwordless Login Code',
            html: `<p>Your one-time code to sign in is: <strong>${otp}</strong>. It is valid for ${OTP_EXPIRY_MINUTES} minutes.</p>`,
        };

        // NOTE: Implement SMS logic here if phoneNumber is the identifier and email is null
        await transporter.sendMail(mailOptions);
        
        res.status(200).json({ 
            message: `OTP sent successfully to your registered ${deliveryMethod}.`
        });

    } catch (error) {
        console.error('Login OTP send error:', error);
        res.status(500).json({ message: 'Server error. Could not send OTP.' });
    }
};

// 5. LOGIN OTP VERIFY CONTROLLER (POST /api/auth/login-otp-verify)
export const loginOtpVerify = async (req, res) => {
    const { identifier, otp } = req.body;

    try {
        // Find a verified user by either their email or phone number who also has a valid OTP
        const alumni = await Alumni.findOne({
            $or: [
                { email: identifier },
                { phoneNumber: identifier }
            ],
            otp: otp,
            otpExpires: { $gt: Date.now() },
            isVerified: true
        });

        // If no user is found, the OTP is invalid or expired
        if (!alumni) {
            return res.status(400).json({ message: 'Invalid or expired OTP. Please try again.' });
        }

        // Clear the OTP fields after successful verification
        alumni.otp = undefined;
        alumni.otpExpires = undefined;
        await alumni.save();

        // Generate a JWT token for the user to log them in
        const token = jwt.sign({ id: alumni._id }, getSecret(), { expiresIn: '1d' });

        // Send back the token and user data
        res.status(200).json({ 
            message: 'OTP verified. Login successful.',
            token,
            user: { id: alumni._id, email: alumni.email, fullName: alumni.fullName }
        });

    } catch (error) {
        console.error('Login OTP Verify Error:', error);
        res.status(500).json({ message: 'Server error during OTP verification.' });
    }
};
