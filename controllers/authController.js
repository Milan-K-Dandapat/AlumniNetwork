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
    // ... (This function is unchanged) ...
    const { email, fullName, batch, phoneNumber, location, company, position } = req.body;

    if (!email || !fullName || !batch || !phoneNumber || !location) {
        return res.status(400).json({ message: 'All required fields must be filled.' });
    }

    try {
        let alumni = await Alumni.findOne({ email });

        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        const alumniData = { 
            fullName, 
            email, 
            phoneNumber, 
            location, 
            batch, 
            otp, 
            otpExpires, 
            isVerified: false 
        };

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
        // Fetch user to get current isVerified status (should be false here)
        const alumni = await Alumni.findOne({
            email,
            otp,
            otpExpires: { $gt: Date.now() }
        });

        if (!alumni) {
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }

        alumni.otp = undefined;
        alumni.otpExpires = undefined;
        await alumni.save({ validateBeforeSave: false }); 

        if (req.io) {
            const newUserCount = await Alumni.countDocuments({ isVerified: true });
            const teacherCount = await Teacher.countDocuments({ isVerified: true });
            req.io.emit('newUserRegistered', newUserCount + teacherCount);
        }

        // --- ⬇️ FIX 1: Add isVerified status to token payload ⬇️ ---
        const token = jwt.sign(
            { id: alumni._id, email: alumni.email, role: 'alumni', isVerified: alumni.isVerified }, 
            getSecret(), 
            { expiresIn: '7d' }
        );
        // --- ⬆️ FIX 1: Add isVerified status to token payload ⬆️ ---

        res.status(201).json({
            message: 'Registration successful!',
            token,
            // ⬇️ FIX 1: Add isVerified status to user response ⬇️
            user: { id: alumni._id, email: alumni.email, fullName: alumni.fullName, userType: 'alumni', isVerified: alumni.isVerified }
            // --- ⬆️ FIX 1: Add isVerified status to user response ⬆️
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
    // ... (This function is unchanged) ...
    const { email, fullName, phoneNumber, location, department, designation } = req.body;

    if (!email || !fullName || !phoneNumber || !location || !department || !designation) {
        return res.status(400).json({ message: 'All required fields must be filled.' });
    }

    try {
        let teacher = await Teacher.findOne({ email });

        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        const teacherData = { 
            fullName, 
            email, 
            phoneNumber, 
            location, 
            department, 
            designation, 
            otp, 
            otpExpires, 
            isVerified: false
        };

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
        // Fetch user to get current isVerified status (should be false here)
        const teacher = await Teacher.findOne({
            email,
            otp,
            otpExpires: { $gt: Date.now() }
        });

        if (!teacher) {
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }

        teacher.otp = undefined;
        teacher.otpExpires = undefined;
        await teacher.save({ validateBeforeSave: false }); 

        if (req.io) {
            const alumniCount = await Alumni.countDocuments({ isVerified: true });
            const newTeacherCount = await Teacher.countDocuments({ isVerified: true });
            req.io.emit('newUserRegistered', alumniCount + newTeacherCount);
        }

        // --- ⬇️ FIX 2: Add isVerified status to token payload ⬇️ ---
        const token = jwt.sign(
            { id: teacher._id, email: teacher.email, role: 'teacher', isVerified: teacher.isVerified }, 
            getSecret(), 
            { expiresIn: '7d' }
        );
        // --- ⬆️ FIX 2: Add isVerified status to token payload ⬆️ ---

        res.status(201).json({
            message: 'Registration successful!',
            token,
            // ⬇️ FIX 2: Add isVerified status to user response ⬇️
            user: { id: teacher._id, email: teacher.email, fullName: teacher.fullName, userType: 'teacher', isVerified: teacher.isVerified }
            // --- ⬆️ FIX 2: Add isVerified status to user response ⬆️
        });

    } catch (error) {
        console.error('Error verifying Teacher OTP:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};


// =========================================================================
// 3. LOGIN & PASSWORD RESET FUNCTIONS
// =========================================================================

// 4A. LOGIN OTP SEND (STUDENT / ALUMNI)
export const loginOtpSend = async (req, res) => {
    // ... (This function is unchanged) ...
    const { identifier } = req.body;
    if (!identifier) { return res.status(400).json({ message: 'Email address is required.' }); }

    try {
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        const user = await Alumni.findOneAndUpdate(
            { email: identifier }, 
            { $set: { otp, otpExpires } },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: 'Student/Alumni user not found.' });
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
    // ... (This function is unchanged) ...
    const { identifier } = req.body;
    if (!identifier) { return res.status(400).json({ message: 'Email address is required.' }); }

    try {
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        const user = await Teacher.findOneAndUpdate(
            { email: identifier }, 
            { $set: { otp, otpExpires } },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: 'Faculty user not found.' });
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
        // Fetch user and its verification status
        const query = {
            email: identifier,
            otp: otp,
            otpExpires: { $gt: Date.now() },
        };

        const user = await Alumni.findOne(query);

        if (!user) { return res.status(400).json({ message: 'Invalid or expired OTP.' }); }

        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save({ validateBeforeSave: false });

        // --- ⬇️ FIX 3: Add isVerified status to token payload ⬇️ ---
        const token = jwt.sign(
            { id: user._id, email: user.email, role: 'alumni', isVerified: user.isVerified }, 
            getSecret(), 
            { expiresIn: '7d' }
        );
        // --- ⬆️ FIX 3: Add isVerified status to token payload ⬆️ ---

        res.status(200).json({
            message: 'OTP verified. Login successful.',
            token,
            // ⬇️ FIX 3: Add isVerified status to user response ⬇️
            user: { id: user._id, email: user.email, fullName: user.fullName, userType: 'alumni', isVerified: user.isVerified }
            // --- ⬆️ FIX 3: Add isVerified status to user response ⬆️
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
        // Fetch user and its verification status
        const query = {
            email: identifier,
            otp: otp,
            otpExpires: { $gt: Date.now() },
        };

        const user = await Teacher.findOne(query);

        if (!user) { return res.status(400).json({ message: 'Invalid or expired OTP.' }); }

        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save({ validateBeforeSave: false });

        // --- ⬇️ FIX 4: Add isVerified status to token payload ⬇️ ---
        const token = jwt.sign(
            { id: user._id, email: user.email, role: 'teacher', isVerified: user.isVerified }, 
            getSecret(), 
            { expiresIn: '7d' }
        );
        // --- ⬆️ FIX 4: Add isVerified status to token payload ⬆️ ---

        res.status(200).json({
            message: 'OTP verified. Login successful.',
            token,
            // ⬇️ FIX 4: Add isVerified status to user response ⬇️
            user: { id: user._id, email: user.email, fullName: user.fullName, userType: 'teacher', isVerified: user.isVerified }
            // --- ⬆️ FIX 4: Add isVerified status to user response ⬆️
        });
    } catch (error) {
        console.error('Login OTP Verify Error (Teacher):', error);
        res.status(500).json({ message: 'Server error during OTP verification.' });
    }
};

// --- Remaining Traditional Login/Password Reset Functions (Retained) ---

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        // Fetch user and its verification status
        const alumni = await Alumni.findOne({ email }).select('+password isVerified');
        if (!alumni || !alumni.password) { return res.status(400).json({ message: 'Invalid credentials.' }); }
        
        const isMatch = await bcrypt.compare(password, alumni.password);
        if (!isMatch) { return res.status(400).json({ message: 'Invalid credentials.' }); }

        // --- ⬇️ FIX 5: Add isVerified status to token payload ⬇️ ---
        const token = jwt.sign(
            { id: alumni._id, email: alumni.email, isVerified: alumni.isVerified }, 
            getSecret(), 
            { expiresIn: '7d' }
        );
        // --- ⬆️ FIX 5: Add isVerified status to token payload ⬆️ ---

        res.status(200).json({ 
            message: 'Login successful.', 
            token, 
            // ⬇️ FIX 5: Add isVerified status to user response ⬇️
            user: { id: alumni._id, email: alumni.email, fullName: alumni.fullName, isVerified: alumni.isVerified } 
            // --- ⬆️ FIX 5: Add isVerified status to user response ⬆️
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

export const forgotPassword = async (req, res) => {
    // ... (This function is unchanged) ...
    const { email } = req.body;
    try {
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        let user = await Alumni.findOneAndUpdate(
            { email },
            { $set: { otp, otpExpires } }
        );

        if (!user) {
            user = await Teacher.findOneAndUpdate(
                { email }, 
                { $set: { otp, otpExpires } }
            );
        }

        if (user) {
            await sendVerificationEmail(email, otp, 'Alumni Password Reset Code');
        }
        
        res.status(200).json({ message: 'If this email is registered, a password reset OTP will be sent.' });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Server error. Could not send reset email.' });
    }
};

export const resetPassword = async (req, res) => {
    // ... (This function is unchanged) ...
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
            { email, otp, otpExpires: { $gt: Date.now() } },
            update
        );

        if (!user) {
            user = await Teacher.findOneAndUpdate(
                { email, otp, otpExpires: { $gt: Date.now() } },
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
