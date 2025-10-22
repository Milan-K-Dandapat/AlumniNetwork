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


// --- HELPER FUNCTION: Send Email via SendGrid (Unchanged) ---
const sendVerificationEmail = async (toEmail, otp, subject) => {
    const msg = {
        from: process.env.EMAIL_USER, // Must be the verified SendGrid sender email
        to: toEmail,
        subject: subject,
        html: `<p>Your OTP is: <strong>${otp}</strong>. It is valid for ${OTP_EXPIRY_MINUTES} minutes.</p>`,
    };
    await sgMail.send(msg);
};


// 🚀 NEW HELPER FUNCTION: Finds the highest numerical ID (Unchanged) ---
const getHighestNumericalID = async () => {
    const alumniCodeQuery = await Alumni
        .findOne({ alumniCode: { $ne: null, $ne: '' } })
        .sort({ alumniCode: -1 })
        .select('alumniCode')
        .exec();

    const teacherCodeQuery = await Teacher
        .findOne({ teacherCode: { $ne: null, $ne: '' } })
        .sort({ teacherCode: -1 })
        .select('teacherCode')
        .exec();

    let highestNumber = 999; // Start new users at 1000

    const extractNumber = (code) => {
        const match = code ? code.match(/^MCA(\d{4})[AF]$/) : null;
        return match && match[1] ? parseInt(match[1], 10) : 0;
    };

    const alumniNumber = extractNumber(alumniCodeQuery?.alumniCode);
    const teacherNumber = extractNumber(teacherCodeQuery?.teacherCode);

    highestNumber = Math.max(highestNumber, alumniNumber, teacherNumber);

    const nextNumber = highestNumber + 1;
    return String(nextNumber).padStart(4, '0');
};


// =========================================================================
// 1. REGISTRATION FUNCTIONS (Unchanged)
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

        const alumniData = {
            fullName,
            email,
            phoneNumber,
            location,
            batch,
            otp,
            otpExpires,
            isVerified: false
            // Default role ('user') is set by the Alumni model
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

// 🚀 UPDATED FUNCTION: Generates and assigns the MCAxxxxA unique ID (Unchanged)
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

        // --- 🚀 START OF UNIQUE ALUMNI CODE GENERATION LOGIC (MCAxxxxA) --- (Unchanged)
        if (!alumni.alumniCode) {
            const nextPaddedNumber = await getHighestNumericalID();
            alumni.alumniCode = `MCA${nextPaddedNumber}A`;
        }
        // --- 🚀 END OF UNIQUE ALUMNI CODE GENERATION LOGIC ---


        alumni.otp = undefined;
        alumni.otpExpires = undefined;
        await alumni.save({ validateBeforeSave: false }); // Role is already 'user'

        if (req.io) {
            const newUserCount = await Alumni.countDocuments({ isVerified: true });
            const teacherCount = await Teacher.countDocuments({ isVerified: true });
            req.io.emit('newUserRegistered', newUserCount + teacherCount);
        }

        res.status(201).json({
            message: 'Registration successful! Your application is now pending administrator approval. Please proceed to the login page.',
            user: { // No token or role needed here, just confirmation
                id: alumni._id,
                email: alumni.email,
                fullName: alumni.fullName,
                userType: 'alumni',
                alumniCode: alumni.alumniCode
            }
        });

    } catch (error) {
        console.error('Error verifying OTP and generating code:', error);
        res.status(500).json({ message: 'Server error during registration finalization.' });
    }
};


// =========================================================================
// 2. REGISTRATION FUNCTIONS (TEACHER/FACULTY) (Unchanged)
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
            // Default role ('user') is set by the Teacher model
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

// 🚀 UPDATED FUNCTION: Generates and assigns the MCAxxxxF unique ID (Unchanged)
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

        // --- 🚀 START OF UNIQUE TEACHER CODE GENERATION LOGIC (MCAxxxxF) --- (Unchanged)
        if (!teacher.teacherCode) {
            const nextPaddedNumber = await getHighestNumericalID();
            teacher.teacherCode = `MCA${nextPaddedNumber}F`;
        }
        // --- 🚀 END OF UNIQUE TEACHER CODE GENERATION LOGIC ---

        teacher.otp = undefined;
        teacher.otpExpires = undefined;
        await teacher.save({ validateBeforeSave: false }); // Role is already 'user'

        if (req.io) {
            const alumniCount = await Alumni.countDocuments({ isVerified: true });
            const newTeacherCount = await Teacher.countDocuments({ isVerified: true });
            req.io.emit('newUserRegistered', alumniCount + newTeacherCount);
        }

        res.status(201).json({
            message: 'Registration successful! Your application is now pending administrator approval. Please proceed to the login page.',
            user: { // No token or role needed here
                id: teacher._id,
                email: teacher.email,
                fullName: teacher.fullName,
                userType: 'teacher',
                alumniCode: teacher.teacherCode // Mapping teacherCode to alumniCode for frontend compatibility
            }
        });

    } catch (error) {
        console.error('Error verifying Teacher OTP and generating code:', error);
        res.status(500).json({ message: 'Server error during registration finalization.' });
    }
};


// =========================================================================
// 3. LOGIN & PASSWORD RESET FUNCTIONS (*** UPDATED ***)
// =========================================================================

// 4A. LOGIN OTP SEND (STUDENT / ALUMNI) - Unchanged
export const loginOtpSend = async (req, res) => {
    const { identifier } = req.body;
    if (!identifier) { return res.status(400).json({ message: 'Email address is required.' }); }

    try {
        const user = await Alumni.findOne({ email: identifier });

        if (!user) {
            return res.status(404).json({ message: 'Student/Alumni user not found.' });
        }

        // Check verification status *before* sending OTP
        if (!user.isVerified) {
            return res.status(403).json({
                message: `Access Denied: Your account is pending admin verification. \nOnce verified, we will send a separate welcome email to ${user.email}.`,
                isVerified: false
            });
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        // Update OTP fields for the found user
        await Alumni.findOneAndUpdate(
            { email: identifier },
            { $set: { otp, otpExpires } },
            { new: true } // Return the updated document (optional here)
        );

        await sendVerificationEmail(user.email, otp, 'Your Passwordless Login Code');
        res.status(200).json({ message: `OTP sent successfully to your registered email.` });

    } catch (error) {
        console.error('Login OTP send error (Student):', error);
        res.status(500).json({ message: 'Server error. Could not send OTP.' });
    }
};

// 4B. LOGIN OTP SEND (TEACHER / FACULTY) - Unchanged
export const loginOtpSendTeacher = async (req, res) => {
    const { identifier } = req.body;
    if (!identifier) { return res.status(400).json({ message: 'Email address is required.' }); }

    try {
        const user = await Teacher.findOne({ email: identifier });

        if (!user) {
            return res.status(404).json({ message: 'Faculty user not found.' });
        }

        // Check verification status *before* sending OTP
        if (!user.isVerified) {
            return res.status(403).json({
                message: `Access Denied: Your account is pending admin verification. \nOnce verified, we will send a separate welcome email to ${user.email}.`,
                isVerified: false
            });
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        // Update OTP fields for the found user
        await Teacher.findOneAndUpdate(
            { email: identifier },
            { $set: { otp, otpExpires } },
            { new: true } // Return the updated document (optional here)
        );

        await sendVerificationEmail(user.email, otp, 'Your Faculty Login Code');
        res.status(200).json({ message: `OTP sent successfully to your registered email.` });

    } catch (error) {
        console.error('Login OTP send error (Teacher):', error);
        res.status(500).json({ message: 'Server error. Could not send OTP.' });
    }
};

// --- (*** UPDATED FUNCTION - ROLE INCLUDED ***) ---
// 5A. LOGIN OTP VERIFY (STUDENT / ALUMNI)
export const loginOtpVerify = async (req, res) => {
    const { identifier, otp } = req.body;
    try {
        const query = {
            email: identifier,
            otp: otp,
            otpExpires: { $gt: Date.now() },
        };

        // Fetch the user including their role
        const user = await Alumni.findOne(query); // Role is included by default

        if (!user) { return res.status(400).json({ message: 'Invalid or expired OTP.' }); }

        // Double-check verification (though loginOtpSend should prevent this)
        if (!user.isVerified) {
            return res.status(403).json({
                message: 'Access Denied. Your account is pending admin verification.',
                isVerified: false
            });
        }

        // Clear OTP fields after successful verification
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save({ validateBeforeSave: false });

        // --- Create JWT Payload with ACTUAL role from database ---
        const payload = {
            id: user._id, // Use user._id which is guaranteed by Mongoose
            email: user.email,
            role: user.role // <-- Use the role fetched from the user document
        };
        const token = jwt.sign(payload, getSecret(), { expiresIn: '7d' });
        // ---

        res.status(200).json({
            message: 'OTP verified. Login successful.',
            token,
            // --- Send User Object with ACTUAL role from database ---
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                userType: 'alumni', // Keep for frontend distinction if needed
                alumniCode: user.alumniCode,
                role: user.role // <-- Include the actual role in the response
            }
            // ---
        });
    } catch (error) {
        console.error('Login OTP Verify Error (Student):', error);
        res.status(500).json({ message: 'Server error during OTP verification.' });
    }
};

// --- (*** UPDATED FUNCTION - ROLE INCLUDED ***) ---
// 5B. LOGIN OTP VERIFY (TEACHER / FACULTY)
export const loginOtpVerifyTeacher = async (req, res) => {
    const { identifier, otp } = req.body;
    try {
        const query = {
            email: identifier,
            otp: otp,
            otpExpires: { $gt: Date.now() },
        };

        // Fetch the user including their role
        const user = await Teacher.findOne(query); // Role is included by default

        if (!user) { return res.status(400).json({ message: 'Invalid or expired OTP.' }); }

        // Double-check verification
        if (!user.isVerified) {
            return res.status(403).json({
                message: 'Access Denied. Your account is pending admin verification.',
                isVerified: false
            });
        }

        // Clear OTP fields
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save({ validateBeforeSave: false });

        // --- Create JWT Payload with ACTUAL role from database ---
        const payload = {
            id: user._id, // Use user._id which is guaranteed by Mongoose
            email: user.email,
            role: user.role // <-- Use the role fetched from the user document
        };
        const token = jwt.sign(payload, getSecret(), { expiresIn: '7d' });
        // ---

        res.status(200).json({
            message: 'OTP verified. Login successful.',
            token,
            // --- Send User Object with ACTUAL role from database ---
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                userType: 'teacher', // Keep for frontend distinction
                alumniCode: user.teacherCode, // Map teacherCode for consistency
                role: user.role // <-- Include the actual role in the response
            }
            // ---
        });
    } catch (error) {
        console.error('Login OTP Verify Error (Teacher):', error);
        res.status(500).json({ message: 'Server error during OTP verification.' });
    }
};

// --- (*** UPDATED FUNCTION - ROLE INCLUDED ***) ---
// 6. TRADITIONAL LOGIN (Alumni Only)
export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        // Fetch user including password and role
        const user = await Alumni.findOne({ email }).select('+password');
        // Role is included by default

        if (!user || !user.password) { return res.status(400).json({ message: 'Invalid credentials.' }); }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) { return res.status(400).json({ message: 'Invalid credentials.' }); }

        // Check verification status
        if (!user.isVerified) {
            return res.status(403).json({
                message: 'Access Denied. Your account is pending admin verification.',
                isVerified: false
            });
        }

        // --- Create JWT Payload with ACTUAL role from database ---
        const payload = {
            id: user._id, // Use user._id which is guaranteed by Mongoose
            email: user.email,
            role: user.role // <-- Use the role fetched from the user document
        };
        const token = jwt.sign(payload, getSecret(), { expiresIn: '7d' });
        // ---

        res.status(200).json({
            message: 'Login successful.',
            token,
            // --- Send User Object with ACTUAL role from database ---
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                alumniCode: user.alumniCode,
                role: user.role // <-- Include the actual role in the response
            }
            // ---
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

// --- Remaining Functions (Unchanged as they do not issue login tokens) ---

export const forgotPassword = async (req, res) => {
    // ... (This function remains unchanged) ...
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
    // ... (This function remains unchanged) ...
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
        res.status(500).json({ message: 'Server error during OTP verification.' });
    }
};