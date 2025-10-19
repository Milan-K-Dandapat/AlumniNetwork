import express from 'express';
import { saveCareerProfile } from '../controllers/careerProfileController.js';
import { getCareerProfile } from '../controllers/getProfileController.js'; 
import auth from '../middleware/auth.js'; 
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url'; // For ES Module path resolution

const router = express.Router();

// --- Directory Setup for Multer ---
// This robust pathing handles both local dev and Render deployment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the uploads directory relative to the server folder
// Assuming structure: /project-root/server/routes/careerProfileRoutes.js
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'resumes');

// Ensure the upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    try {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        console.log(`Created Multer upload directory: ${UPLOAD_DIR}`);
    } catch (e) {
        console.error("CRITICAL ERROR: Failed to create upload directory. Check file permissions!", e);
        // This stops the server cleanly if the path can't be created
        throw new Error("File System Error: Cannot initialize upload directory.");
    }
}

// -------------------------------------------------------------------
// --- Multer Configuration for Resume Upload (POST Route) ---
// -------------------------------------------------------------------

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Use the authenticated user's ID for consistent, unique naming
        const userId = req.user ? req.user._id : Date.now(); 
        const ext = path.extname(file.originalname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${userId}-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 5 }, // Enforce 5MB file size limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('File Type Error: Only PDF files are allowed!'), false);
        }
    }
});

// -------------------------------------------------------------------
// --- Route Definitions ---
// -------------------------------------------------------------------

// 1. GET /api/career-profile/me: Fetch the authenticated user's profile data (Persistence FIX)
router.route('/me').get(auth, getCareerProfile); 

// 2. POST /api/career-profile: Save or update the profile (Submission FIX)
router.route('/').post(
    auth, 
    // Custom middleware to wrap Multer and handle file upload errors cleanly
    (req, res, next) => {
        upload.single('resume')(req, res, function (err) {
            
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ success: false, message: `Upload Error: ${err.message}` });
            } 
            else if (err) {
                return res.status(400).json({ success: false, message: err.message });
            }
            
            next();
        });
    },
    saveCareerProfile 
);

export default router;
