import Alumni from '../models/Alumni.js';
import Teacher from '../models/Teacher.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sgMail from '@sendgrid/mail'; // SendGrid client
import mongoose from 'mongoose'; 

const OTP_EXPIRY_MINUTES = 10;
// Fallback secret for safety if environment variable fails
const getSecret = () => process.env.JWT_SECRET || 'a8f5b1e3d7c2a4b6e8d9f0a1b3c5d7e9f2a4b6c8d0e1f3a5b7c9d1e3f5a7b9c1';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// 💡 NEW CONSTANT: Default password for promoted admins
const DEFAULT_ADMIN_PASSWORD = 'igit@mca';

// =========================================================================
// --- HELPERS (UNCHANGED) ---
// =========================================================================

const findUserById = async (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    let user = await Alumni.findById(id).select('+password +role +isVerified');
    if (!user) {
        user = await Teacher.findById(id).select('+password +role +isVerified');
    }
    return user;
};

const findUserByIdAndUpdate = async (id, update, options = {}) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    let user = await Alumni.findByIdAndUpdate(id, update, { new: true, ...options });
    if (!user) {
        user = await Teacher.findByIdAndUpdate(id, update, { new: true, ...options });
    }
    return user;
};

const sendVerificationEmail = async (toEmail, otp, subject) => {
    const msg = {
        from: process.env.EMAIL_USER, 
        to: toEmail,
        subject: subject,
        html: `<p>Your OTP is: <strong>${otp}</strong>. It is valid for ${OTP_EXPIRY_MINUTES} minutes.</p>`,
    };
    try {
         await sgMail.send(msg);
    } catch (error) {
        console.error('SendGrid Error:', error.response?.body || error.message);
    }
};

const getHighestNumericalID = async () => {
    const alumniCodeQuery = await Alumni.findOne({ alumniCode: { $ne: null, $ne: '' } }).sort({ alumniCode: -1 }).select('alumniCode').exec();
    const teacherCodeQuery = await Teacher.findOne({ teacherCode: { $ne: null, $ne: '' } }).sort({ teacherCode: -1 }).select('teacherCode').exec();
    let highestNumber = 999;
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
// 1. GENERAL REGISTRATION & OTP FUNCTIONS (UNCHANGED)
// =========================================================================

export const sendOtp = async (req, res) => {
    const { email, fullName, batch, phoneNumber, location, company, position } = req.body;
    if (!email || !fullName || !batch || !phoneNumber || !location) { return res.status(400).json({ message: 'All required fields must be filled.' }); }
    try {
        let alumni = await Alumni.findOne({ email });
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        const alumniData = { fullName, email, phoneNumber, location, batch, otp, otpExpires, isVerified: false };
        if (company) alumniData.company = company;
        if (position) alumniData.position = position;
        if (alumni) { alumni.set(alumniData); await alumni.save(); } else { await Alumni.create(alumniData); }
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
        if (!alumni) { return res.status(400).json({ message: 'Invalid or expired OTP.' }); }
        if (!alumni.alumniCode) { alumni.alumniCode = `MCA${await getHighestNumericalID()}A`; }
        alumni.otp = undefined; alumni.otpExpires = undefined; await alumni.save({ validateBeforeSave: false }); 
        if (req.io) { 
            const newUserCount = await Alumni.countDocuments({ isVerified: true });
            const teacherCount = await Teacher.countDocuments({ isVerified: true });
            req.io.emit('newUserRegistered', newUserCount + teacherCount); 
        }
        res.status(201).json({ message: 'Registration successful! Your application is now pending administrator approval. Please proceed to the login page.', user: { id: alumni._id, email: alumni.email, fullName: alumni.fullName, userType: 'alumni', alumniCode: alumni.alumniCode } });
    } catch (error) {
        console.error('Error verifying OTP and generating code:', error);
        res.status(500).json({ message: 'Server error during registration finalization.' });
    }
};

export const sendOtpTeacher = async (req, res) => {
    const { email, fullName, phoneNumber, location, department, designation } = req.body;
    if (!email || !fullName || !phoneNumber || !location || !department || !designation) { return res.status(400).json({ message: 'All required fields must be filled.' }); }
    try {
        let teacher = await Teacher.findOne({ email });
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        const teacherData = { fullName, email, phoneNumber, location, department, designation, otp, otpExpires, isVerified: false };
        if (teacher) { teacher.set(teacherData); await teacher.save(); } else { await Teacher.create(teacherData); }
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
        if (!teacher) { return res.status(400).json({ message: 'Invalid or expired OTP.' }); }
        if (!teacher.teacherCode) { teacher.teacherCode = `MCA${await getHighestNumericalID()}F`; }
        teacher.otp = undefined; teacher.otpExpires = undefined; await teacher.save({ validateBeforeSave: false }); 
        if (req.io) { 
            const alumniCount = await Alumni.countDocuments({ isVerified: true });
            const newTeacherCount = await Teacher.countDocuments({ isVerified: true });
            req.io.emit('newUserRegistered', alumniCount + newTeacherCount); 
        }
        res.status(201).json({ message: 'Registration successful! Your application is now pending administrator approval. Please proceed to the login page.', user: { id: teacher._id, email: teacher.email, fullName: teacher.fullName, userType: 'teacher', alumniCode: teacher.teacherCode } });
    } catch (error) {
        console.error('Error verifying Teacher OTP and generating code:', error);
        res.status(500).json({ message: 'Server error during registration finalization.' });
    }
};


// =========================================================================
// 2. GENERAL LOGIN FUNCTIONS (UNCHANGED)
// =========================================================================

export const loginOtpSend = async (req, res) => {
    const { identifier } = req.body;
    if (!identifier) { return res.status(400).json({ message: 'Email address is required.' }); }
    try {
        const user = await Alumni.findOne({ email: identifier });
        if (!user) { return res.status(404).json({ message: 'Student/Alumni user not found.' }); }
        if (!user.isVerified) { return res.status(403).json({ message: `Access Denied: Your account is pending admin verification. \nOnce verified, we will send a separate welcome email to ${user.email}.`, isVerified: false }); }
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        await Alumni.findOneAndUpdate({ email: identifier }, { $set: { otp, otpExpires } }, { new: true });
        await sendVerificationEmail(user.email, otp, 'Your Passwordless Login Code');
        res.status(200).json({ message: `OTP sent successfully to your registered email.` });
    } catch (error) {
        console.error('Login OTP send error (Student):', error);
        res.status(500).json({ message: 'Server error. Could not send OTP.' });
    }
};

export const loginOtpSendTeacher = async (req, res) => {
    const { identifier } = req.body;
    if (!identifier) { return res.status(400).json({ message: 'Email address is required.' }); }
    try {
        const user = await Teacher.findOne({ email: identifier });
        if (!user) { return res.status(404).json({ message: 'Faculty user not found.' }); }
        if (!user.isVerified) { return res.status(403).json({ message: `Access Denied: Your account is pending admin verification. \nOnce verified, we will send a separate welcome email to ${user.email}.`, isVerified: false }); }
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        await Teacher.findOneAndUpdate({ email: identifier }, { $set: { otp, otpExpires } }, { new: true });
        await sendVerificationEmail(user.email, otp, 'Your Faculty Login Code');
        res.status(200).json({ message: `OTP sent successfully to your registered email.` });
    } catch (error) {
        console.error('Login OTP send error (Teacher):', error);
        res.status(500).json({ message: 'Server error. Could not send OTP.' });
    }
};

export const loginOtpVerify = async (req, res) => {
    const { identifier, otp } = req.body;
    try {
        const user = await Alumni.findOne({ email: identifier, otp: otp, otpExpires: { $gt: Date.now() } });
        if (!user) { return res.status(400).json({ message: 'Invalid or expired OTP.' }); }
        if (!user.isVerified) { return res.status(403).json({ message: 'Access Denied. Your account is pending admin verification.', isVerified: false }); }
        user.otp = undefined; user.otpExpires = undefined; await user.save({ validateBeforeSave: false });
        const payload = { id: user._id, email: user.email, role: user.role };
        const token = jwt.sign(payload, getSecret(), { expiresIn: '7d' });
        res.status(200).json({ message: 'OTP verified. Login successful.', token, user: { id: user._id, email: user.email, fullName: user.fullName, userType: 'alumni', alumniCode: user.alumniCode, role: user.role } });
    } catch (error) {
        console.error('Login OTP Verify Error (Student):', error);
        res.status(500).json({ message: 'Server error during OTP verification.' });
    }
};

export const loginOtpVerifyTeacher = async (req, res) => {
    const { identifier, otp } = req.body;
    try {
        const user = await Teacher.findOne({ email: identifier, otp: otp, otpExpires: { $gt: Date.now() } });
        if (!user) { return res.status(400).json({ message: 'Invalid or expired OTP.' }); }
        if (!user.isVerified) { return res.status(403).json({ message: 'Access Denied. Your account is pending admin verification.', isVerified: false }); }
        user.otp = undefined; user.otpExpires = undefined; await user.save({ validateBeforeSave: false });
        const payload = { id: user._id, email: user.email, role: user.role };
        const token = jwt.sign(payload, getSecret(), { expiresIn: '7d' });
        res.status(200).json({ message: 'OTP verified. Login successful.', token, user: { id: user._id, email: user.email, fullName: user.fullName, userType: 'teacher', alumniCode: user.teacherCode, role: user.role } });
    } catch (error) {
        console.error('Login OTP Verify Error (Teacher):', error);
        res.status(500).json({ message: 'Server error during OTP verification.' });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await Alumni.findOne({ email }).select('+password');
        if (!user || !user.password) { return res.status(400).json({ message: 'Invalid credentials.' }); }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) { return res.status(400).json({ message: 'Invalid credentials.' }); }
        if (!user.isVerified) { return res.status(403).json({ message: 'Access Denied. Your account is pending admin verification.', isVerified: false }); }
        const payload = { id: user._id, email: user.email, role: user.role };
        const token = jwt.sign(payload, getSecret(), { expiresIn: '7d' });
        res.status(200).json({ message: 'Login successful.', token, user: { id: user._id, email: user.email, fullName: user.fullName, alumniCode: user.alumniCode, role: user.role } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};


// =========================================================================
// 3. ADMIN PANEL AUTHENTICATION HANDLERS (UNCHANGED)
// =========================================================================

export const adminRegister = async (req, res) => {
    const { username, password } = req.body;
    const email = username;
    
    if (!email.includes('@') || password.length < 5) { return res.status(400).json({ message: 'Invalid registration format. Please use a valid email as username and a stronger password.' }); }

    try {
        let user = await Alumni.findOne({ email });
        if (!user) { user = await Teacher.findOne({ email }); }

        if (user) { return res.status(409).json({ message: 'Account already exists. Please log in or choose a different username.' }); }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newAdmin = new Alumni({
            email: email,
            username: email, 
            password: hashedPassword,
            fullName: username, 
            role: 'admin',
            isVerified: false,
        });
        await newAdmin.save();

        res.status(201).json({ message: 'Admin account created and awaiting approval.', user: { username: newAdmin.username, role: newAdmin.role, isApproved: newAdmin.isVerified } });
    } catch (error) {
        console.error('Admin Registration Error:', error);
        res.status(500).json({ message: 'Failed to register admin account.' });
    }
};

export const adminLogin = async (req, res) => {
    const { username, password } = req.body;
    const identifier = username; // Can be email, Connect ID (MCA1003A), or Teacher Code

    try {
        // 💡 FIX: Search for user by email, Connect ID, or Teacher Code
        let user = await Alumni.findOne({ 
            $or: [
                { email: identifier },
                { alumniCode: identifier }, 
                { username: identifier }
            ] 
        }).select('+password +role +isVerified');
        let userType = 'alumni';
        
        if (!user) {
            user = await Teacher.findOne({ 
                 $or: [
                    { email: identifier },
                    { teacherCode: identifier }, 
                    { username: identifier }
                ] 
            }).select('+password +role +isVerified');
            userType = 'teacher';
        }

        if (!user || !user.password) { return res.status(404).json({ message: 'Admin account not found or is passwordless (use OTP flow).' }); }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) { return res.status(401).json({ message: 'Invalid credentials.' }); }

        if (user.role !== 'admin' && user.role !== 'superadmin') { return res.status(403).json({ message: 'Access Denied. User does not have an admin role.' }); }
        if (!user.isVerified) { return res.status(403).json({ message: 'Account pending Super Admin approval.', isApproved: false }); }
        
        const payload = { id: user._id, email: user.email || identifier, role: user.role };
        const token = jwt.sign(payload, getSecret(), { expiresIn: '7d' });

        res.status(200).json({ message: 'Admin login successful.', token, user: { id: user._id, username: user.username || user.email, role: user.role, isApproved: user.isVerified, userType: userType } });
    } catch (error) {
        console.error('Admin Login Error:', error);
        res.status(500).json({ message: 'Server error during admin login.' });
    }
};


// =========================================================================
// 4. SUPER ADMIN MANAGEMENT HANDLERS (UPDATED PROMOTION LOGIC)
// =========================================================================

/**
 * @function handleGetAllPendingAdmins
 * Gets all user accounts registered as 'admin' but not yet verified (isVerified: false).
 */
export const handleGetAllPendingAdmins = async (req, res) => {
    try {
        const alumniPending = await Alumni.find({ role: 'admin', isVerified: false }).select('fullName email role isVerified _id username');
        const teacherPending = await Teacher.find({ role: 'admin', isVerified: false }).select('fullName email role isVerified _id username');
        const pendingAdmins = [...alumniPending, ...teacherPending];
        res.status(200).json(pendingAdmins);
    } catch (error) {
        console.error('Error fetching pending admins:', error);
        res.status(500).json({ message: 'Server error fetching pending admin list.' });
    }
};


/**
 * @function handleApproveAdmin
 * Sets a pending admin's 'isVerified' field to true and sets the role to 'admin'.
 */
export const handleApproveAdmin = async (req, res) => {
    const { id } = req.params;
    try {
        const approvedUser = await findUserByIdAndUpdate(
            id, 
            { $set: { isVerified: true, role: 'admin' } }
        );

        if (!approvedUser) { return res.status(404).json({ message: 'User not found.' }); }
        
        res.status(200).json({ 
            message: 'Admin account approved.',
            user: { _id: approvedUser._id, email: approvedUser.email, fullName: approvedUser.fullName, role: approvedUser.role, isVerified: approvedUser.isVerified }
        });

    } catch (error) {
        console.error('Error approving admin:', error);
        res.status(500).json({ message: 'Server error during admin approval.' });
    }
};


/**
 * @function handleRejectAdmin
 * Deletes an unapproved user from the database.
 */
export const handleRejectAdmin = async (req, res) => {
    const { id } = req.params;
    try {
        let result = await Alumni.findByIdAndDelete(id);
        if (!result) { result = await Teacher.findByIdAndDelete(id); }

        if (!result) { return res.status(404).json({ message: 'User not found.' }); }

        res.status(200).json({ message: 'Admin registration rejected and account deleted.' });

    } catch (error) {
        console.error('Error rejecting admin:', error);
        res.status(500).json({ message: 'Server error during admin rejection.' });
    }
};


/**
 * @function handleGetAllUsers
 * Gets all users (Alumni and Teachers) excluding the Super Admin for role management panel.
 */
export const handleGetAllUsers = async (req, res) => {
    // 💡 FIX: Ensure the email is retrieved robustly from environment variables
    const SUPER_ADMIN_EMAIL = process.env.REACT_APP_SUPER_ADMIN_EMAIL || process.env.SUPER_ADMIN_EMAIL || 'milankumar7770@gmail.com'; 
    try {
        // Use select to retrieve all necessary fields
        const selectFields = 'fullName email role alumniCode teacherCode isVerified _id';
        
        const alumni = await Alumni.find().select(selectFields);
        const teachers = await Teacher.find().select(selectFields);
        
        // Combine and map to ensure consistency (handle null/undefined codes)
        const allUsers = [...alumni, ...teachers].map(u => ({
            ...u.toObject(),
            alumniCode: u.alumniCode || u.teacherCode, // Use the correct code based on model
        }));
        
        const filteredUsers = allUsers.filter(u => u.email !== SUPER_ADMIN_EMAIL);
        
        res.json(filteredUsers.sort((a, b) => a.fullName.localeCompare(b.fullName)));
    } catch (err) {
        // CRITICAL: Log the detailed error to the server console
        console.error('CRITICAL ERROR fetching all users:', err);
        res.status(500).send('Server Error fetching user list.');
    }
};


/**
 * @function handleUpdateUserRole
 * Updates a user's role (admin <-> user).
 */
export const handleUpdateUserRole = async (req, res) => {
    const { role: newRole } = req.body;
    const { id } = req.params;

    if (!newRole || (newRole !== 'admin' && newRole !== 'user')) { return res.status(400).json({ msg: 'Invalid role specified.' }); }
    
    // Safety Check: Prevent modifying the Super Admin's role
    const userToUpdate = await findUserById(id);
    const SUPER_ADMIN_EMAIL = process.env.REACT_APP_SUPER_ADMIN_EMAIL || process.env.SUPER_ADMIN_EMAIL || 'milankumar7770@gmail.com'; 

    if (userToUpdate && userToUpdate.email === SUPER_ADMIN_EMAIL) {
         return res.status(403).json({ msg: 'Cannot modify the Super Admin role via this endpoint.' });
    }
    
    try {
        let updateData = { role: newRole };
        
        // 💡 NEW LOGIC: If promoting to admin, set the default password and verification status
        if (newRole === 'admin' && userToUpdate?.role !== 'admin') {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, salt);
            // Ensure they are verified, if they were a pending user before
            updateData.isVerified = true; 
        } else if (newRole === 'user' && userToUpdate?.role === 'admin') {
            // Optional: If revoking admin, clear the password if it matches the default one
            // NOTE: For simplicity and security, we'll just keep the hashed password but downgrade the role.
            // If you want to force them back to OTP/Email login, you'd clear the password field, but that's complex.
        }

        const updatedUser = await findUserByIdAndUpdate(
            id, 
            { $set: updateData }
        );

        if (!updatedUser) { return res.status(404).json({ msg: 'User not found' }); }

        res.json({ id: updatedUser._id, role: updatedUser.role, email: updatedUser.email }); 
    } catch (err) {
        console.error('Error updating user role:', err.message);
        if (err.kind === 'ObjectId') { return res.status(400).json({ message: 'Invalid User ID format' }); }
        res.status(500).send('Server Error');
    }
};


// =========================================================================
// 5. PASSWORD RESET FUNCTIONS (UNCHANGED)
// =========================================================================

export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        let user = await Alumni.findOneAndUpdate({ email }, { $set: { otp, otpExpires } });
        if (!user) { user = await Teacher.findOneAndUpdate({ email }, { $set: { otp, otpExpires } }); }
        if (user) { await sendVerificationEmail(email, otp, 'Alumni Password Reset Code'); }
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
        const update = { password: hashedPassword, otp: undefined, otpExpires: undefined };
        let user = await Alumni.findOneAndUpdate({ email, otp, otpExpires: { $gt: Date.now() } }, update);
        if (!user) { user = await Teacher.findOneAndUpdate({ email, otp, otpExpires: { $gt: Date.now() } }, update); }
        if (!user) { return res.status(400).json({ message: 'Invalid or expired OTP.' }); }
        res.status(200).json({ message: 'Password has been successfully reset. You can now log in.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error during OTP verification.' });
    }
};