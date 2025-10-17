import Alumni from '../models/Alumni.js';
import Teacher from '../models/Teacher.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sgMail from '@sendgrid/mail'; // SendGrid client

const OTP_EXPIRY_MINUTES = 10;
// CRITICAL FIX: Ensures the fallback secret is used if the environment variable fails
const getSecret = () => process.env.JWT_SECRET || 'a8f5b1e3d7c2a4b6e8d9f0a1b3c5d7e9f2a4b6c8d0e1f3a5b7c9d1e3f5a7b9c1';


// =========================================================================
// ✅ SENDGRID CONFIGURATION
// =========================================================================
sgMail.setApiKey(process.env.SENDGRID_API_KEY);


// --- HELPER FUNCTION: Send Email via SendGrid ---
const sendVerificationEmail = async (toEmail, otp, subject) => {
    const msg = {
        from: process.env.EMAIL_USER, // Must be the verified SendGrid sender email
        to: toEmail,
        subject: subject,
        html: `<p>Your OTP is: <strong>${otp}</strong>. It is valid for ${OTP_EXPIRY_MINUTES} minutes.</p>`,
    };
    await sgMail.send(msg);
};


// =========================================================================
// 1. REGISTRATION FUNCTIONS (ALUMNI/STUDENT)
// =========================================================================

export const sendOtp = async (req, res) => {
    const { email, fullName, batch, phoneNumber, location, company, position } = req.body;

    if (!email || !fullName || !batch || !phoneNumber || !location) {
        return res.status(400).json({ message: 'All required fields must be filled.' });
    }

    try {
        let alumni = await Alumni.findOne({ email });

        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        const alumniData = { fullName, email, phoneNumber, location, batch, otp, otpExpires };

        if (company) alumniData.company = company;
        if (position) alumniData.position = position;

        if (alumni) {
            alumni.set(alumniData);
            await alumni.save();
        } else {
            await Alumni.create(alumniData);
        }

        await sendVerificationEmail(email, otp, 'Your AlumniConnect Verification Code');

        res.status(200).json({ message: 'OTP sent successfully to your email.' });

    } catch (error) {
        console.error('Error sending email (SendGrid API Failed):', error);
        res.status(500).json({ message: 'Server error. Could not send OTP.' });
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
        await alumni.save({ validateBeforeSave: false }); // Bypass validation for older users

        if (req.io) {
            const newUserCount = await Alumni.countDocuments({ isVerified: true });
            const teacherCount = await Teacher.countDocuments({ isVerified: true });
            req.io.emit('newUserRegistered', newUserCount + teacherCount);
        }

        const token = jwt.sign({ id: alumni._id, role: 'alumni' }, getSecret(), { expiresIn: '7d' });

        res.status(201).json({
            message: 'Registration successful!',
            token,
            user: { id: alumni._id, email: alumni.email, fullName: alumni.fullName, userType: 'alumni' }
        });

    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};


// =========================================================================
// 2. REGISTRATION FUNCTIONS (TEACHER/FACULTY)
// =========================================================================

export const sendOtpTeacher = async (req, res) => {
    const { email, fullName, phoneNumber, location, department, designation } = req.body;

    if (!email || !fullName || !phoneNumber || !location || !department || !designation) {
        return res.status(400).json({ message: 'All required fields must be filled.' });
    }

    try {
        let teacher = await Teacher.findOne({ email });

        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        const teacherData = { fullName, email, phoneNumber, location, department, designation, otp, otpExpires };

        if (teacher) {
            teacher.set(teacherData);
            await teacher.save();
        } else {
            await Teacher.create(teacherData);
        }

        await sendVerificationEmail(email, otp, 'Faculty Registration Verification Code');

        res.status(200).json({ message: 'OTP sent successfully to your faculty email.' });

    } catch (error) {
        console.error('Error sending email (Teacher Registration Failed):', error);
        res.status(500).json({ message: 'Server error. Could not send OTP.' });
    }
};

export const verifyOtpAndRegisterTeacher = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const teacher = await Teacher.findOne({
            email,
            otp,
            otpExpires: { $gt: Date.now() }
        });

        if (!teacher) {
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }

        teacher.isVerified = true;
        teacher.otp = undefined;
        teacher.otpExpires = undefined;
        await teacher.save({ validateBeforeSave: false }); // Bypass validation for older users

        if (req.io) {
            const alumniCount = await Alumni.countDocuments({ isVerified: true });
            const newTeacherCount = await Teacher.countDocuments({ isVerified: true });
            req.io.emit('newUserRegistered', alumniCount + newTeacherCount);
        }

        const token = jwt.sign({ id: teacher._id, role: 'teacher' }, getSecret(), { expiresIn: '7d' });

        res.status(201).json({
            message: 'Registration successful!',
            token,
            user: { id: teacher._id, email: teacher.email, fullName: teacher.fullName, userType: 'teacher' }
        });

    } catch (error) {
        console.error('Error verifying Teacher OTP:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};


// =========================================================================
// 3. LOGIN & PASSWORD RESET FUNCTIONS
// =========================================================================

// --- START: NEW ROLE-SPECIFIC LOGIN FUNCTIONS ---

// 4A. LOGIN OTP SEND (STUDENT / ALUMNI)
export const loginOtpSend = async (req, res) => {
    const { identifier } = req.body;
    if (!identifier) { return res.status(400).json({ message: 'Email address is required.' }); }

    try {
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        const user = await Alumni.findOneAndUpdate(
            { email: identifier, isVerified: true },
            { $set: { otp, otpExpires } },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: 'Student/Alumni user not found or is not verified.' });
        }

        await sendVerificationEmail(user.email, otp, 'Your Passwordless Login Code');
        res.status(200).json({ message: `OTP sent successfully to your registered email.` });

    } catch (error) {
        console.error('Login OTP send error (Student):', error);
        res.status(500).json({ message: 'Server error. Could not send OTP.' });
    }
};

// 4B. LOGIN OTP SEND (TEACHER / FACULTY)
export const loginOtpSendTeacher = async (req, res) => {
    const { identifier } = req.body;
    if (!identifier) { return res.status(400).json({ message: 'Email address is required.' }); }

    try {
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        const user = await Teacher.findOneAndUpdate(
            { email: identifier, isVerified: true },
            { $set: { otp, otpExpires } },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: 'Faculty user not found or is not verified.' });
        }

        await sendVerificationEmail(user.email, otp, 'Your Faculty Login Code');
        res.status(200).json({ message: `OTP sent successfully to your registered email.` });

    } catch (error) {
        console.error('Login OTP send error (Teacher):', error);
        res.status(500).json({ message: 'Server error. Could not send OTP.' });
    }
};

// 5A. LOGIN OTP VERIFY (STUDENT / ALUMNI)
export const loginOtpVerify = async (req, res) => {
    const { identifier, otp } = req.body;
    try {
        const query = {
            email: identifier,
            otp: otp,
            otpExpires: { $gt: Date.now() },
            isVerified: true
        };

        const user = await Alumni.findOne(query);

        if (!user) { return res.status(400).json({ message: 'Invalid or expired OTP.' }); }

        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save({ validateBeforeSave: false });

        const token = jwt.sign({ id: user._id, role: 'alumni' }, getSecret(), { expiresIn: '7d' });
        res.status(200).json({
            message: 'OTP verified. Login successful.',
            token,
            user: { id: user._id, email: user.email, fullName: user.fullName, userType: 'alumni' }
        });
    } catch (error) {
        console.error('Login OTP Verify Error (Student):', error);
        res.status(500).json({ message: 'Server error during OTP verification.' });
    }
};

// 5B. LOGIN OTP VERIFY (TEACHER / FACULTY)
export const loginOtpVerifyTeacher = async (req, res) => {
    const { identifier, otp } = req.body;
    try {
        const query = {
            email: identifier,
            otp: otp,
            otpExpires: { $gt: Date.now() },
            isVerified: true
        };

        const user = await Teacher.findOne(query);

        if (!user) { return res.status(400).json({ message: 'Invalid or expired OTP.' }); }

        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save({ validateBeforeSave: false });

        const token = jwt.sign({ id: user._id, role: 'teacher' }, getSecret(), { expiresIn: '7d' });
        res.status(200).json({
            message: 'OTP verified. Login successful.',
            token,
            user: { id: user._id, email: user.email, fullName: user.fullName, userType: 'teacher' }
        });
    } catch (error) {
        console.error('Login OTP Verify Error (Teacher):', error);
        res.status(500).json({ message: 'Server error during OTP verification.' });
    }
};

// --- END: NEW ROLE-SPECIFIC LOGIN FUNCTIONS ---


// --- Remaining Traditional Login/Password Reset Functions (Retained) ---

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const alumni = await Alumni.findOne({ email }).select('+password');
        if (!alumni || !alumni.password) { return res.status(400).json({ message: 'Invalid credentials.' }); }
        if (!alumni.isVerified) { return res.status(400).json({ message: 'Account not verified.' }); }
        const isMatch = await bcrypt.compare(password, alumni.password);
        if (!isMatch) { return res.status(400).json({ message: 'Invalid credentials.' }); }

        const token = jwt.sign({ id: alumni._id }, getSecret(), { expiresIn: '7d' });
        res.status(200).json({ message: 'Login successful.', token, user: { id: alumni._id, email: alumni.email, fullName: alumni.fullName } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        // ✅ FIX: Use findOneAndUpdate to prevent validation error on old accounts
        let user = await Alumni.findOneAndUpdate(
            { email, isVerified: true },
            { $set: { otp, otpExpires } }
        );

        if (!user) {
            // Also check the Teacher collection
            user = await Teacher.findOneAndUpdate(
                { email, isVerified: true },
                { $set: { otp, otpExpires } }
            );
        }

        // If a user was found in either collection, send the email
        if (user) {
            await sendVerificationEmail(email, otp, 'Alumni Password Reset Code');
        }

        // Always send a generic success message to prevent user enumeration
        res.status(200).json({ message: 'If this email is registered, a password reset OTP will be sent.' });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Server error. Could not send reset email.' });
    }
};

export const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const update = {
            password: hashedPassword,
            otp: undefined,
            otpExpires: undefined
        };

        let user = await Alumni.findOneAndUpdate(
            { email, otp, otpExpires: { $gt: Date.now() }, isVerified: true },
            update
        );

        if (!user) {
            user = await Teacher.findOneAndUpdate(
                { email, otp, otpExpires: { $gt: Date.now() }, isVerified: true },
                update
            );
        }
        
        if (!user) { return res.status(400).json({ message: 'Invalid or expired OTP.' }); }

        res.status(200).json({ message: 'Password has been successfully reset. You can now log in.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error during password reset.' });
    }
};