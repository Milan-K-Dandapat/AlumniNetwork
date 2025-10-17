import Alumni from '../models/Alumni.js';
import Teacher from '../models/Teacher.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sgMail from '@sendgrid/mail';

const OTP_EXPIRY_MINUTES = 10;
const getSecret = () => process.env.JWT_SECRET || 'a8f5b1e3d7c2a4b6e8d9f0a1b3c5d7e9f2a4b6c8d0e1f3a5b7c9d1e3f5a7b9c1';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendVerificationEmail = async (toEmail, otp, subject) => {
    const msg = {
        from: process.env.EMAIL_USER,
        to: toEmail,
        subject: subject,
        html: `<p>Your OTP is: <strong>${otp}</strong>. It is valid for ${OTP_EXPIRY_MINUTES} minutes.</p>`,
    };
    await sgMail.send(msg);
};

// =========================================================================
// REGISTRATION FUNCTIONS (No changes needed here)
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
        const alumni = await Alumni.findOne({ email, otp, otpExpires: { $gt: Date.now() } });
        if (!alumni) {
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }
        alumni.isVerified = true;
        alumni.otp = undefined;
        alumni.otpExpires = undefined;
        await alumni.save({ validateBeforeSave: false });
        if (req.io) {
            const newUserCount = await Alumni.countDocuments({ isVerified: true });
            const teacherCount = await Teacher.countDocuments({ isVerified: true });
            req.io.emit('newUserRegistered', newUserCount + teacherCount);
        }
        const token = jwt.sign({ id: alumni._id }, getSecret(), { expiresIn: '7d' });
        res.status(201).json({ message: 'Registration successful!', token, user: { id: alumni._id, email: alumni.email, fullName: alumni.fullName } });
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

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
        const teacher = await Teacher.findOne({ email, otp, otpExpires: { $gt: Date.now() } });
        if (!teacher) {
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }
        teacher.isVerified = true;
        teacher.otp = undefined;
        teacher.otpExpires = undefined;
        await teacher.save({ validateBeforeSave: false });
        if (req.io) {
            const alumniCount = await Alumni.countDocuments({ isVerified: true });
            const newTeacherCount = await Teacher.countDocuments({ isVerified: true });
            req.io.emit('newUserRegistered', alumniCount + newTeacherCount);
        }
        const token = jwt.sign({ id: teacher._id }, getSecret(), { expiresIn: '7d' });
        res.status(201).json({ message: 'Registration successful!', token, user: { id: teacher._id, email: teacher.email, fullName: teacher.fullName } });
    } catch (error) {
        console.error('Error verifying Teacher OTP:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

// =========================================================================
// ⭐ 3. UNIFIED LOGIN & PASSWORD RESET FUNCTIONS (UPDATED)
// =========================================================================

/**
 * Handles sending a login OTP. It now accepts a 'role' in the body
 * to determine whether to search the Alumni or Teacher collection.
 */
export const loginOtpSend = async (req, res) => {
    // The frontend now sends 'identifier' and 'role'
    const { identifier, role } = req.body;
    
    if (!identifier || !role) {
        return res.status(400).json({ message: 'Email and role are required.' });
    }

    // Determine which Mongoose model to use based on the role
    const Model = role === 'teacher' ? Teacher : Alumni;
    const roleName = role === 'teacher' ? 'Faculty' : 'Alumni';

    try {
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        // Find the user ONLY in the correct collection
        const user = await Model.findOneAndUpdate(
            { email: identifier, isVerified: true },
            { $set: { otp, otpExpires } },
            { new: true }
        );

        // If no user is found in the specified collection, return the error
        if (!user) {
            return res.status(404).json({ message: `Login failed. User not found in this role or service error.` });
        }
        
        // Send the OTP email
        await sendVerificationEmail(user.email, otp, 'Your Login Verification Code');
        res.status(200).json({ message: `OTP sent successfully to your registered email.` });

    } catch (error) {
        console.error('Login OTP send error:', error);
        res.status(500).json({ message: 'Server error. Could not send OTP.' });
    }
};

/**
 * Handles verifying a login OTP. It also accepts a 'role' to ensure
 * it verifies against the correct user type.
 */
export const loginOtpVerify = async (req, res) => {
    const { identifier, otp, role } = req.body;

    if (!identifier || !otp || !role) {
        return res.status(400).json({ message: 'Email, OTP, and role are required.' });
    }

    const Model = role === 'teacher' ? Teacher : Alumni;

    try {
        const query = {
            email: identifier,
            otp: otp,
            otpExpires: { $gt: Date.now() },
            isVerified: true
        };

        const user = await Model.findOne(query);

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }

        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save({ validateBeforeSave: false });

        const token = jwt.sign({ id: user._id, role: role }, getSecret(), { expiresIn: '7d' });
        res.status(200).json({
            message: 'OTP verified. Login successful.',
            token,
            user: { id: user._id, email: user.email, fullName: user.fullName, role }
        });
    } catch (error) {
        console.error('Login OTP Verify Error:', error);
        res.status(500).json({ message: 'Server error during OTP verification.' });
    }
};


// --- Legacy Functions (Retained but should be updated if used) ---
export const login = async (req, res) => {
    // This is for password-based login and only checks Alumni.
    // It should be updated if you plan to use it for teachers too.
    const { email, password } = req.body;
    try {
        const alumni = await Alumni.findOne({ email }).select('+password');
        if (!alumni || !alumni.password) { return res.status(400).json({ message: 'Invalid credentials.' }); }
        if (!alumni.isVerified) { return res.status(400).json({ message: 'Account not verified.' }); }
        const isMatch = await bcrypt.compare(password, alumni.password);
        if (!isMatch) { return res.status(400).json({ message: 'Invalid credentials.' }); }
        const token = jwt.sign({ id: alumni._id, role: 'student' }, getSecret(), { expiresIn: '7d' });
        res.status(200).json({ message: 'Login successful.', token, user: { id: alumni._id, email: alumni.email, fullName: alumni.fullName } });
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
};

// ... (forgotPassword and resetPassword can remain as they check both models)
export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        let user = await Alumni.findOneAndUpdate({ email, isVerified: true }, { $set: { otp, otpExpires } });
        if (!user) {
            user = await Teacher.findOneAndUpdate({ email, isVerified: true }, { $set: { otp, otpExpires } });
        }
        if (user) {
            await sendVerificationEmail(email, otp, 'Alumni Password Reset Code');
        }
        res.status(200).json({ message: 'If this email is registered, a password reset OTP will be sent.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error. Could not send reset email.' });
    }
};

export const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        const update = { password: hashedPassword, otp: undefined, otpExpires: undefined };
        let user = await Alumni.findOneAndUpdate({ email, otp, otpExpires: { $gt: Date.now() }, isVerified: true }, update);
        if (!user) {
            user = await Teacher.findOneAndUpdate({ email, otp, otpExpires: { $gt: Date.now() }, isVerified: true }, update);
        }
        if (!user) { return res.status(400).json({ message: 'Invalid or expired OTP.' }); }
        res.status(200).json({ message: 'Password has been successfully reset. You can now log in.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error during password reset.' });
    }
};