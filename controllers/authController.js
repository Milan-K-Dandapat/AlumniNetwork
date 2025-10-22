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
    // ... (Keep your existing code for sendVerificationEmail)
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
    // ... (Keep your existing code for getHighestNumericalID)
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
    // ... (Keep your existing code for sendOtp)
    const { email, fullName, batch, phoneNumber, location, company, position } = req.body;
    if (!email || !fullName || !batch || !phoneNumber || !location) {
        return res.status(400).json({ message: 'All required fields must be filled.' });
    }
    try {
        let alumni = await Alumni.findOne({ email });
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        const alumniData = { fullName, email, phoneNumber, location, batch, otp, otpExpires, isVerified: false };
        if (company) alumniData.company = company;
        if (position) alumniData.position = position;
        if (alumni) { alumni.set(alumniData); await alumni.save(); }
        else { await Alumni.create(alumniData); }
        await sendVerificationEmail(email, otp, 'Your AlumniConnect Verification Code');
        res.status(200).json({ message: 'OTP sent successfully to your email.' });
    } catch (error) { console.error('Error sending email (SendGrid API Failed):', error); res.status(500).json({ message: 'Server error. Could not send OTP.' }); }
};

export const verifyOtpAndRegister = async (req, res) => {
    // ... (Keep your existing code for verifyOtpAndRegister)
    const { email, otp } = req.body;
    try {
        const alumni = await Alumni.findOne({ email, otp, otpExpires: { $gt: Date.now() } });
        if (!alumni) { return res.status(400).json({ message: 'Invalid or expired OTP.' }); }
        if (!alumni.alumniCode) { const nextPaddedNumber = await getHighestNumericalID(); alumni.alumniCode = `MCA${nextPaddedNumber}A`; }
        alumni.otp = undefined; alumni.otpExpires = undefined;
        await alumni.save({ validateBeforeSave: false });
        if (req.io) { const newUserCount = await Alumni.countDocuments({ isVerified: true }); const teacherCount = await Teacher.countDocuments({ isVerified: true }); req.io.emit('newUserRegistered', newUserCount + teacherCount); }
        res.status(201).json({ message: 'Registration successful! Your application is now pending administrator approval.', user: { id: alumni._id, email: alumni.email, fullName: alumni.fullName, userType: 'alumni', alumniCode: alumni.alumniCode } });
    } catch (error) { console.error('Error verifying OTP and generating code:', error); res.status(500).json({ message: 'Server error during registration finalization.' }); }
};


// =========================================================================
// 2. REGISTRATION FUNCTIONS (TEACHER/FACULTY) (Unchanged)
// =========================================================================

export const sendOtpTeacher = async (req, res) => {
    // ... (Keep your existing code for sendOtpTeacher)
    const { email, fullName, phoneNumber, location, department, designation } = req.body;
    if (!email || !fullName || !phoneNumber || !location || !department || !designation) { return res.status(400).json({ message: 'All required fields must be filled.' }); }
    try {
        let teacher = await Teacher.findOne({ email });
        const otp = crypto.randomInt(100000, 999999).toString(); const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        const teacherData = { fullName, email, phoneNumber, location, department, designation, otp, otpExpires, isVerified: false };
        if (teacher) { teacher.set(teacherData); await teacher.save(); }
        else { await Teacher.create(teacherData); }
        await sendVerificationEmail(email, otp, 'Faculty Registration Verification Code');
        res.status(200).json({ message: 'OTP sent successfully to your faculty email.' });
    } catch (error) { console.error('Error sending email (Teacher Registration Failed):', error); res.status(500).json({ message: 'Server error. Could not send OTP.' }); }
};

export const verifyOtpAndRegisterTeacher = async (req, res) => {
    // ... (Keep your existing code for verifyOtpAndRegisterTeacher)
    const { email, otp } = req.body;
    try {
        const teacher = await Teacher.findOne({ email, otp, otpExpires: { $gt: Date.now() } });
        if (!teacher) { return res.status(400).json({ message: 'Invalid or expired OTP.' }); }
        if (!teacher.teacherCode) { const nextPaddedNumber = await getHighestNumericalID(); teacher.teacherCode = `MCA${nextPaddedNumber}F`; }
        teacher.otp = undefined; teacher.otpExpires = undefined;
        await teacher.save({ validateBeforeSave: false });
        if (req.io) { const alumniCount = await Alumni.countDocuments({ isVerified: true }); const newTeacherCount = await Teacher.countDocuments({ isVerified: true }); req.io.emit('newUserRegistered', alumniCount + newTeacherCount); }
        res.status(201).json({ message: 'Registration successful! Your application is now pending administrator approval.', user: { id: teacher._id, email: teacher.email, fullName: teacher.fullName, userType: 'teacher', alumniCode: teacher.teacherCode } });
    } catch (error) { console.error('Error verifying Teacher OTP and generating code:', error); res.status(500).json({ message: 'Server error during registration finalization.' }); }
};


// =========================================================================
// 3. LOGIN & PASSWORD RESET FUNCTIONS (*** LOGIN IS THE ONLY CHANGE ***)
// =========================================================================

// --- LOGIN OTP SEND (STUDENT / ALUMNI) - Unchanged ---
export const loginOtpSend = async (req, res) => {
    // ... (Keep your existing code for loginOtpSend)
    const { identifier } = req.body;
    if (!identifier) { return res.status(400).json({ message: 'Email address is required.' }); }
    try {
        const user = await Alumni.findOne({ email: identifier });
        if (!user) { return res.status(404).json({ message: 'Student/Alumni user not found.' }); }
        if (!user.isVerified) { return res.status(403).json({ message: `Access Denied: Your account is pending admin verification.`, isVerified: false }); }
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        await Alumni.findOneAndUpdate({ email: identifier }, { $set: { otp, otpExpires } });
        await sendVerificationEmail(user.email, otp, 'Your Passwordless Login Code');
        res.status(200).json({ message: `OTP sent successfully.` });
    } catch (error) { console.error('Login OTP send error (Student):', error); res.status(500).json({ message: 'Server error.' }); }
};

// --- LOGIN OTP SEND (TEACHER / FACULTY) - Unchanged ---
export const loginOtpSendTeacher = async (req, res) => {
    // ... (Keep your existing code for loginOtpSendTeacher)
    const { identifier } = req.body;
    if (!identifier) { return res.status(400).json({ message: 'Email address is required.' }); }
    try {
        const user = await Teacher.findOne({ email: identifier });
        if (!user) { return res.status(404).json({ message: 'Faculty user not found.' }); }
        if (!user.isVerified) { return res.status(403).json({ message: `Access Denied: Your account is pending admin verification.`, isVerified: false }); }
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        await Teacher.findOneAndUpdate({ email: identifier }, { $set: { otp, otpExpires } });
        await sendVerificationEmail(user.email, otp, 'Your Faculty Login Code');
        res.status(200).json({ message: `OTP sent successfully.` });
    } catch (error) { console.error('Login OTP send error (Teacher):', error); res.status(500).json({ message: 'Server error.' }); }
};

// --- LOGIN OTP VERIFY (STUDENT / ALUMNI) - Unchanged ---
export const loginOtpVerify = async (req, res) => {
    // ... (Keep your existing code for loginOtpVerify)
    const { identifier, otp } = req.body;
    try {
        const query = { email: identifier, otp: otp, otpExpires: { $gt: Date.now() } };
        const user = await Alumni.findOne(query);
        if (!user) { return res.status(400).json({ message: 'Invalid or expired OTP.' }); }
        if (!user.isVerified) { return res.status(403).json({ message: 'Access Denied. Account pending verification.', isVerified: false }); }
        user.otp = undefined; user.otpExpires = undefined;
        await user.save({ validateBeforeSave: false });
        const payload = { id: user._id, email: user.email, role: user.role };
        const token = jwt.sign(payload, getSecret(), { expiresIn: '7d' });
        res.status(200).json({ message: 'OTP verified. Login successful.', token, user: { id: user._id, email: user.email, fullName: user.fullName, userType: 'alumni', alumniCode: user.alumniCode, role: user.role } });
    } catch (error) { console.error('Login OTP Verify Error (Student):', error); res.status(500).json({ message: 'Server error.' }); }
};

// --- LOGIN OTP VERIFY (TEACHER / FACULTY) - Unchanged ---
export const loginOtpVerifyTeacher = async (req, res) => {
    // ... (Keep your existing code for loginOtpVerifyTeacher)
    const { identifier, otp } = req.body;
    try {
        const query = { email: identifier, otp: otp, otpExpires: { $gt: Date.now() } };
        const user = await Teacher.findOne(query);
        if (!user) { return res.status(400).json({ message: 'Invalid or expired OTP.' }); }
        if (!user.isVerified) { return res.status(403).json({ message: 'Access Denied. Account pending verification.', isVerified: false }); }
        user.otp = undefined; user.otpExpires = undefined;
        await user.save({ validateBeforeSave: false });
        const payload = { id: user._id, email: user.email, role: user.role };
        const token = jwt.sign(payload, getSecret(), { expiresIn: '7d' });
        res.status(200).json({ message: 'OTP verified. Login successful.', token, user: { id: user._id, email: user.email, fullName: user.fullName, userType: 'teacher', alumniCode: user.teacherCode, role: user.role } });
    } catch (error) { console.error('Login OTP Verify Error (Teacher):', error); res.status(500).json({ message: 'Server error.' }); }
};


// --- ✅✅✅ THIS IS THE UPDATED LOGIN FUNCTION ✅✅✅ ---
// Handles BOTH Super Admin (from env) and Alumni (from DB)
export const login = async (req, res) => {
    // 1. Get username and password from request (frontend sends 'username')
    const { username, password } = req.body;

    // --- 2. SUPER ADMIN CHECK ---
    // Check if credentials match the Super Admin defined in environment variables
    if (username === 'Milan' && password === process.env.SUPER_ADMIN_PASSWORD) {

        // Create a user object for the Super Admin (not stored in DB)
        const superAdminUser = {
            _id: 'superadmin_milan', // Static unique ID
            username: 'Milan',
            email: 'milan@superadmin.com', // Placeholder email
            fullName: 'Milan (Super Admin)',
            role: 'superadmin', // Set the correct role
            isApproved: true, // Super admin is always approved
            isVerified: true, // Super admin is always verified
            alumniCode: 'MCA0000A' // Placeholder
        };

        // Create JWT payload for the Super Admin
        const payload = {
            id: superAdminUser._id, // Use the static ID
            email: superAdminUser.email,
            role: superAdminUser.role // Use 'superadmin' role
        };

        // Sign the token using the secret
        const token = jwt.sign(payload, getSecret(), { expiresIn: '1d' }); // Shorter expiry for admin

        // Send successful response with token and user object
        return res.status(200).json({
            message: 'Super Admin login successful.',
            token,
            user: { // Send necessary info to the frontend
                id: superAdminUser._id,
                email: superAdminUser.email, // Frontend might expect email
                fullName: superAdminUser.fullName,
                alumniCode: superAdminUser.alumniCode, // Include placeholder
                role: superAdminUser.role, // Send the correct role
                isApproved: superAdminUser.isApproved // Send approval status (matches frontend)
                // username: superAdminUser.username // Optionally send username too
            }
        });
    } // --- End of Super Admin Check ---

    // --- 3. IF NOT SUPER ADMIN, CHECK ALUMNI DATABASE ---
    try {
        // Find Alumni by email (using the 'username' field from the form)
        const user = await Alumni.findOne({ email: username }).select('+password'); // Ensure password field is selected

        // Check if user exists and has a password set
        if (!user || !user.password) {
            return res.status(401).json({ message: 'Invalid credentials.' }); // Use 401 for unauthorized
        }

        // Compare the provided password with the hashed password in the DB
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' }); // Use 401
        }

        // Check if the alumni account has been verified by an admin
        if (!user.isVerified) {
            return res.status(403).json({ // Use 403 for forbidden/pending
                message: 'Access Denied. Your account is pending admin verification.',
                isVerified: false // Send verification status for frontend check
            });
        }

        // Create JWT payload for the regular Alumni user
        const payload = {
            id: user._id,
            email: user.email,
            role: user.role // Use the role from the database ('user' or 'admin')
        };

        // Sign the token
        const token = jwt.sign(payload, getSecret(), { expiresIn: '7d' }); // Longer expiry for regular users

        // Send successful response
        res.status(200).json({
            message: 'Login successful.',
            token,
            user: { // Send necessary user info to frontend
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                alumniCode: user.alumniCode,
                role: user.role, // Send the actual role
                isApproved: user.isVerified // Map isVerified to isApproved for frontend consistency
            }
        });
    } catch (error) { // Catch any unexpected errors during DB lookup or bcrypt
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login process.' });
    }
};
// --- ✅✅✅ END OF UPDATED LOGIN FUNCTION ✅✅✅ ---


// --- FORGOT PASSWORD (Unchanged) ---
export const forgotPassword = async (req, res) => {
    // ... (Keep your existing code for forgotPassword)
    const { email } = req.body;
    try {
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        let user = await Alumni.findOneAndUpdate({ email }, { $set: { otp, otpExpires } });
        if (!user) { user = await Teacher.findOneAndUpdate({ email }, { $set: { otp, otpExpires } }); }
        if (user) { await sendVerificationEmail(email, otp, 'Alumni Password Reset Code'); }
        res.status(200).json({ message: 'If email is registered, OTP sent.' });
    } catch (error) { console.error('Forgot password error:', error); res.status(500).json({ message: 'Server error.' }); }
};

// --- RESET PASSWORD (Unchanged) ---
export const resetPassword = async (req, res) => {
    // ... (Keep your existing code for resetPassword)
    const { email, otp, newPassword } = req.body;
    try {
        const salt = await bcrypt.genSalt(10); const hashedPassword = await bcrypt.hash(newPassword, salt);
        const update = { password: hashedPassword, otp: undefined, otpExpires: undefined };
        let user = await Alumni.findOneAndUpdate({ email, otp, otpExpires: { $gt: Date.now() } }, update);
        if (!user) { user = await Teacher.findOneAndUpdate({ email, otp, otpExpires: { $gt: Date.now() } }, update); }
        if (!user) { return res.status(400).json({ message: 'Invalid or expired OTP.' }); }
        res.status(200).json({ message: 'Password reset successfully.' });
    } catch (error) { console.error('Reset password error:', error); res.status(500).json({ message: 'Server error.' }); }
};