import express from 'express';
// 1. Consolidated Import: Fetching both functions from the single controller file
import { saveCareerProfile, getMyCareerProfile } from '../controllers/careerProfileController.js';
import auth from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();

// --- Directory Setup for Multer (NO CHANGES REQUIRED) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'resumes');

// Ensure the upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    try {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        console.log(`Created Multer upload directory: ${UPLOAD_DIR}`);
    } catch (e) {
        console.error("CRITICAL ERROR: Failed to create upload directory. Check file permissions!", e);
        throw new Error("File System Error: Cannot initialize upload directory.");
    }
}

// -------------------------------------------------------------------
// --- Multer Configuration for Resume Upload (NO CHANGES REQUIRED) ---
// -------------------------------------------------------------------

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Uses req.user._id (set by 'auth' middleware) for unique naming
        // Fallback to Date.now() if req.user somehow isn't populated yet (shouldn't happen after auth)
        const userId = req.user?._id || Date.now();
        const ext = path.extname(file.originalname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${userId}-${uniqueSuffix}${ext}`);
    }
});

const resumeUpload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 5 }, // 5MB file size limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true); // Accept PDF files
        } else {
            // Reject other file types with a specific error
            cb(new Error('File Type Error: Only PDF files are allowed!'), false);
        }
    }
});

// -------------------------------------------------------------------
// --- Route Definitions ---
// -------------------------------------------------------------------

// 1. GET /api/career-profile/me: Fetch the authenticated user's profile data
// Applies auth middleware first, then calls the controller function
router.route('/me').get(auth, getMyCareerProfile);

// 2. POST /api/career-profile: Save or update the profile
// Applies auth, then multer for file upload, then the save controller function
router.route('/').post(
    auth, // 1. Authenticate user, attach req.user
    resumeUpload.single('resume'), // 2. Handle single file upload named 'resume', attach req.file if present
    saveCareerProfile // 3. Call the controller to process data and save
);

export default router;