// routes/careerProfileRoutes.js

import express from 'express';
import { saveCareerProfile } from '../controllers/careerProfileController.js';
import auth from '../middleware/auth.js'; 
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// -------------------------------------------------------------------
// --- Multer Configuration for Resume Upload 
// -------------------------------------------------------------------

// 1. Define the destination folder for uploads
// Note: path.resolve ensures the path is absolute from the project root
const UPLOAD_DIR = path.resolve('uploads', 'resumes');

// Ensure the upload directory exists before setting up storage
if (!fs.existsSync(UPLOAD_DIR)) {
    // The { recursive: true } option ensures parent directories are created if they don't exist
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 2. Set up Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // null for no error, UPLOAD_DIR is the target folder
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Create a unique filename: user-ID-timestamp-random.pdf
        // We safely assume req.user is populated by the preceding 'auth' middleware
        const userId = req.user ? req.user._id : 'temp'; 
        const ext = path.extname(file.originalname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${userId}-${uniqueSuffix}${ext}`);
    }
});

// 3. Set up Multer Upload Middleware instance
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 5 }, // 5MB file size limit
    fileFilter: (req, file, cb) => {
        // Accept only PDF files
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            // CRITICAL: Throw a custom Error for non-PDF files
            cb(new Error('File Type Error: Only PDF files are allowed!'), false);
        }
    }
});

// -------------------------------------------------------------------
// --- Route Definition (Finalized with Multer Error Handler) 
// -------------------------------------------------------------------

router.route('/').post(
    auth, 
    // CRITICAL FIX: Custom middleware to wrap Multer and handle its errors
    (req, res, next) => {
        // Use upload.single() for the field named 'resume' from the client-side FormData
        upload.single('resume')(req, res, function (err) {
            
            // 1. Handle Multer-specific errors (e.g., file size limit)
            if (err instanceof multer.MulterError) {
                // If MulterError is thrown, send a clean 400 JSON response
                return res.status(400).json({ success: false, message: `Upload Error: ${err.message}` });
            } 
            
            // 2. Handle other errors (e.g., the custom File Type Error)
            else if (err) {
                // If any other error is thrown (like the custom "File Type Error"), send clean JSON
                return res.status(400).json({ success: false, message: err.message });
            }
            
            // 3. Success: If no error, proceed to the controller
            next();
        });
    },
    // The controller now receives: 
    // - req.user (from auth)
    // - req.body.profileData (text fields, JSON string)
    // - req.file (resume file metadata)
    saveCareerProfile
);

export default router;