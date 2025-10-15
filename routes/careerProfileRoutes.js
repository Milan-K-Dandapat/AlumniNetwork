// routes/careerProfileRoutes.js

import express from 'express';
import { saveCareerProfile } from '../controllers/careerProfileController.js';
import auth from '../middleware/auth.js'; 
import multer from 'multer'; // 👈 NEW: Import multer
import path from 'path';    // 👈 NEW: Import path (for directory manipulation)
import fs from 'fs';        // 👈 NEW: Import fs (for checking/creating directories)

const router = express.Router();

// --- Multer Configuration for Resume Upload ---

// 1. Define the destination folder for uploads
const UPLOAD_DIR = path.resolve('uploads', 'resumes');

// Ensure the upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 2. Set up Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Create a unique filename: user-ID-timestamp.pdf
        const userId = req.user ? req.user.id : 'temp'; // Get ID from auth middleware
        const ext = path.extname(file.originalname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${userId}-${uniqueSuffix}${ext}`);
    }
});

// 3. Set up Multer Upload Middleware
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 5 }, // 5MB file size limit
    fileFilter: (req, file, cb) => {
        // Accept only PDF files
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed!'), false);
        }
    }
});

// --- Route Definition (UPDATED) ---

// The route now uses three middlewares:
// 1. auth: Authenticates the user (req.user is populated)
// 2. upload.single('resume'): Handles the file upload from the field named 'resume'
// 3. saveCareerProfile: Processes the text data (req.body.profileData) and file metadata (req.file)
router.route('/').post(
    auth, 
    upload.single('resume'), // 👈 CRITICAL FIX: Add multer middleware
    saveCareerProfile
);

export default router;