import express from 'express';
import { saveCareerProfile } from '../controllers/careerProfileController.js';
import auth from '../middleware/auth.js'; 
import multer from 'multer';
import path from 'path';
import fs from 'fs';
// We are removing path resolution here to rely on a globally defined root path
// import { fileURLToPath } from 'url'; 

const router = express.Router();

// 🚨 CRITICAL FIX: You MUST define and export the absolute project root (e.g., PROJECT_ROOT) 
// from your main server.js file and import it here. For demonstration, we assume a standard structure.
// If your server.js is running from the root, you can set the root path there.

// --- Multer Configuration for Resume Upload (RELYING ON PROJECT ROOT) ---

// NOTE: Since the full project structure is unknown, we must rely on a reliable path, 
// usually resolved from the server's running directory.
// For the absolute safest route, we'll revert to path.resolve and trust the current working directory, 
// but define the structure cleanly.

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'resumes'); 
console.log(`Multer Upload Directory: ${UPLOAD_DIR}`); // Log for debugging in terminal

// Ensure the upload directory exists to prevent server crashes on file write
if (!fs.existsSync(UPLOAD_DIR)) {
    try {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        console.log(`Created directory: ${UPLOAD_DIR}`);
    } catch (e) {
        console.error("CRITICAL ERROR: Failed to create upload directory. Check file permissions!", e);
        // Throwing here will crash the server cleanly before accepting requests.
        throw new Error("File System Error: Cannot initialize upload directory.");
    }
}

// -------------------------------------------------------------------
// --- Multer Configuration for Resume Upload 
// -------------------------------------------------------------------

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Use the user's ID for consistent naming, falling back to timestamp if auth is somehow bypassed
        // Multer only calls this after the 'auth' middleware, so req.user should exist.
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
            // Throw a specific error if file type is wrong
            cb(new Error('File Type Error: Only PDF files are allowed!'), false);
        }
    }
});

// -------------------------------------------------------------------
// --- Route Definition 
// -------------------------------------------------------------------

router.route('/').post(
    auth, // 1. Secure the route using your existing authentication middleware
    
    // 2. Custom middleware to wrap Multer and handle file upload errors cleanly
    (req, res, next) => {
        upload.single('resume')(req, res, function (err) {
            
            // Handle Multer-specific errors (e.g., file size limit, path errors)
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ success: false, message: `Upload Error: ${err.message}` });
            } 
            // Handle custom errors (e.g., file type error)
            else if (err) {
                return res.status(400).json({ success: false, message: err.message });
            }
            
            // If Multer is successful (or no file was sent), proceed to controller
            next();
        });
    },
    
    saveCareerProfile // 3. Execute the controller logic
);

export default router;
