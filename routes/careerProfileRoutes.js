import express from 'express';
import { saveCareerProfile } from '../controllers/careerProfileController.js';
import auth from '../middleware/auth.js'; 
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url'; 

const router = express.Router();

// --- Directory Setup (CRITICAL FOR MULTER ABSOLUTE PATH) ---
// Defines __dirname equivalent for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Sets the absolute path for the uploads folder (e.g., /server/uploads/resumes)
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'resumes'); 

// Ensure the upload directory exists to prevent server crashes on file write
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
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
// --- Route Definition (Consistent with your existing architecture)
// -------------------------------------------------------------------

router.route('/').post(
    auth, // 1. Secure the route using your existing authentication middleware
    
    // 2. Custom middleware to wrap Multer and handle file upload errors cleanly (prevents 500 HTML crashes)
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
