import Alumni from '../models/Alumni.js'; 
import Teacher from '../models/Teacher.js'; // 🚨 CRITICAL: Teacher Model imported
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
    const { email, fullName, batch, phoneNumber, company, position } = req.body; 

    if (!email || !fullName || !batch || !phoneNumber) {
        return res.status(400).json({ message: 'All required fields must be filled.' });
    }

    try {
        let alumni = await Alumni.findOne({ email });
        
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000); 
        
        const alumniData = { fullName, email, phoneNumber, batch, otp, otpExpires };
        
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
        await alumni.save();
        
        // Update total user count (optional, but good practice)
        if (req.io) {
            const newUserCount = await Alumni.countDocuments({ isVerified: true });
            const teacherCount = await Teacher.countDocuments({ isVerified: true });
            req.io.emit('newUserRegistered', newUserCount + teacherCount);
        }

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


// =========================================================================
// 2. REGISTRATION FUNCTIONS (TEACHER/FACULTY) 🚨 NEW LOGIC 🚨
// =========================================================================

export const sendOtpTeacher = async (req, res) => {
    const { email, fullName, phoneNumber, department, designation } = req.body; 

    if (!email || !fullName || !phoneNumber || !department || !designation) {
        return res.status(400).json({ message: 'All required fields must be filled.' });
    }

    try {
        // 1. Check if teacher already exists (using Teacher model)
        let teacher = await Teacher.findOne({ email });
        
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000); 
        
        const teacherData = { fullName, email, phoneNumber, department, designation, otp, otpExpires };

        // 2. Create or update teacher record with new OTP
        if (teacher) {
            teacher.set(teacherData); 
            await teacher.save();
        } else {
            await Teacher.create(teacherData);
        }
        
        // 3. Send email
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
        await teacher.save();
        
        // Update total user count (optional, but good practice)
        if (req.io) {
            const alumniCount = await Alumni.countDocuments({ isVerified: true });
            const newTeacherCount = await Teacher.countDocuments({ isVerified: true });
            req.io.emit('newUserRegistered', alumniCount + newTeacherCount);
        }

        // Generate token using teacher's _id
        const token = jwt.sign({ id: teacher._id }, getSecret(), { expiresIn: '1d' });

        res.status(201).json({ 
            message: 'Registration successful!', 
            token,
            user: { id: teacher._id, email: teacher.email, fullName: teacher.fullName } 
        });

    } catch (error) {
        console.error('Error verifying Teacher OTP:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};


// =========================================================================
// 3. LOGIN FUNCTIONS (Updated to search BOTH Alumni and Teacher for OTP Login)
// =========================================================================

// --- Helper to find user by identifier across both models (Needed for login OTP) ---
const findVerifiedUserByIdentifier = async (identifier) => {
    const query = { $or: [{ email: identifier }, { phoneNumber: identifier }], isVerified: true };
    
    let user = await Alumni.findOne(query).select('+password +otp +otpExpires');
    if (user) return { user, model: Alumni, type: 'alumni' };

    user = await Teacher.findOne(query).select('+password +otp +otpExpires');
    if (user) return { user, model: Teacher, type: 'teacher' };
    
    return null;
}

// 4. LOGIN OTP SEND CONTROLLER (Updated to search both models)
export const loginOtpSend = async (req, res) => {
    const { identifier } = req.body; 
    if (!identifier) { return res.status(400).json({ message: 'Email or phone number is required.' }); }
    
    try {
        const foundUser = await findVerifiedUserByIdentifier(identifier);
        
        if (!foundUser) { 
            return res.status(404).json({ message: 'Login failed. User not found or not verified.' }); 
        }
        
        const { user, model } = foundUser;
        
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000); 
        
        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save(); // Save OTP back to the correct model (Alumni or Teacher)

        let deliveryMethod = user.email ? 'email' : 'phone number';
        
        await sendVerificationEmail(user.email, otp, 'Your Passwordless Login Code');
        
        res.status(200).json({ message: `OTP sent successfully to your registered ${deliveryMethod}.` });
    } catch (error) {
        console.error('Login OTP send error:', error);
        res.status(500).json({ message: 'Server error. Could not send OTP.' });
    }
};

// 5. LOGIN OTP VERIFY CONTROLLER (Updated to search both models)
export const loginOtpVerify = async (req, res) => {
    const { identifier, otp } = req.body;
    try {
        const query = { 
            $or: [{ email: identifier }, { phoneNumber: identifier }], 
            otp: otp, 
            otpExpires: { $gt: Date.now() }, 
            isVerified: true 
        };
        
        // Attempt to find in Alumni first
        let user = await Alumni.findOne(query);
        let userType = 'alumni';

        // If not found, try Teacher model
        if (!user) {
            user = await Teacher.findOne(query);
            userType = 'teacher';
        }
        
        if (!user) { return res.status(400).json({ message: 'Invalid or expired OTP.' }); }
        
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();
        
        const token = jwt.sign({ id: user._id }, getSecret(), { expiresIn: '1d' });
        
        res.status(200).json({ message: 'OTP verified. Login successful.', token, user: { id: user._id, email: user.email, fullName: user.fullName, userType } });
    } catch (error) {
        console.error('Login OTP Verify Error:', error);
        res.status(500).json({ message: 'Server error during OTP verification.' });
    }
};


// --- Remaining Traditional Login/Password Reset Functions (Retained) ---

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        // NOTE: This should ideally be updated to search both models as well
        const alumni = await Alumni.findOne({ email }).select('+password');
        if (!alumni || !alumni.password) { return res.status(400).json({ message: 'Invalid credentials.' }); }
        if (!alumni.isVerified) { return res.status(400).json({ message: 'Account not verified.' }); }
        const isMatch = await bcrypt.compare(password, alumni.password);
        if (!isMatch) { return res.status(400).json({ message: 'Invalid credentials.' }); }
        const token = jwt.sign({ id: alumni._id }, getSecret(), { expiresIn: '1d' });
        res.status(200).json({ message: 'Login successful.', token, user: { id: alumni._id, email: alumni.email, fullName: alumni.fullName } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const alumni = await Alumni.findOne({ email, isVerified: true });
        if (!alumni) { return res.status(200).json({ message: 'If this email is registered, a password reset OTP will be sent.' }); }
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000); 
        alumni.otp = otp;
        alumni.otpExpires = otpExpires;
        await alumni.save();
        
        await sendVerificationEmail(email, otp, 'Alumni Password Reset Code');
        
        res.status(200).json({ message: 'OTP sent successfully for password reset.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Server error. Could not send reset email.' });
    }
};

export const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        const alumni = await Alumni.findOne({ email, otp, otpExpires: { $gt: Date.now() }, isVerified: true });
        if (!alumni) { return res.status(400).json({ message: 'Invalid or expired OTP.' }); }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        alumni.password = hashedPassword;
        alumni.otp = undefined; 
        alumni.otpExpires = undefined; 
        await alumni.save();
        res.status(200).json({ message: 'Password has been successfully reset. You can now log in.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error during password reset.' });
    }
};
