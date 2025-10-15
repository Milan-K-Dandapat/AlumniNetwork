import express from 'express';
import { saveCareerProfile } from '../controllers/careerProfileController.js';
import auth from '../middleware/auth.js'; 
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url'; // 👈 NEW: Import for directory resolution

const router = express.Router();

// --- Directory Setup (CRITICAL FIX) ---
// Define __dirname equivalent for ES Modules to ensure consistent path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------------------------------------------------------------------
// --- Multer Configuration for Resume Upload 
// -------------------------------------------------------------------

// 1. Define the destination folder for uploads using absolute paths
// This ensures that regardless of where the script is run, it resolves correctly
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'resumes'); // Adjusted pathing

// Ensure the upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    // This is defensive and necessary to prevent a crash if the folder is missing
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 2. Set up Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR); // Use the absolute path
    },
    filename: (req, file, cb) => {
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
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
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
            
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ success: false, message: `Upload Error: ${err.message}` });
            } 
            else if (err) {
                // This catches our custom file filter error and generic server errors
                return res.status(400).json({ success: false, message: err.message });
            }
            
            // If Multer is successful (or no file was sent), proceed to controller
            next();
        });
    },
    saveCareerProfile
);

export default router;
