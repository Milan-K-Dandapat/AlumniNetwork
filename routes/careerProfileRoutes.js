import express from 'express';
// Assuming 'getCareerProfile' is imported correctly from this file path
import { saveCareerProfile } from '../controllers/careerProfileController.js'; 
import { getCareerProfile } from '../controllers/getProfileController.js'; // ⚠️ Still suspect this file path is wrong
import auth from '../middleware/auth.js'; 
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url'; 

const router = express.Router();

// --- Directory Setup for Multer ---
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
// --- Multer Configuration for Resume Upload (POST Route) ---
// -------------------------------------------------------------------

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Use the authenticated user's ID for consistent, unique naming
        // Multer's filename function runs BEFORE the final controller, 
        // but AFTER 'auth' middleware, so req.user should be available.
        const userId = req.user ? req.user._id : Date.now(); 
        const ext = path.extname(file.originalname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${userId}-${uniqueSuffix}${ext}`);
    }
});

// ⭐ Renamed 'upload' to 'resumeUpload' to avoid confusion, though your code structure handles it.
const resumeUpload = multer({ 
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
// This is the route the frontend calls on load. If the controller throws an error, 
// the frontend gets a 500 or 401 and displays "Access Denied."
router.route('/me').get(auth, getCareerProfile); 

// 2. POST /api/career-profile: Save or update the profile (Submission FIX)
router.route('/').post(
    auth, 
    // Custom middleware to wrap Multer and handle file upload errors cleanly
    (req, res, next) => {
        // ⭐ Use the named multer instance 'resumeUpload'
        resumeUpload.single('resume')(req, res, function (err) {
            
            if (err instanceof multer.MulterError) {
                // Log the error to the server console for better debugging
                console.error("Multer Error:", err.message);
                return res.status(400).json({ success: false, message: `Upload Error: ${err.message}` });
            } 
            else if (err) {
                console.error("File Filter Error:", err.message);
                return res.status(400).json({ success: false, message: err.message });
            }
            
            next();
        });
    },
    saveCareerProfile 
);

export default router;