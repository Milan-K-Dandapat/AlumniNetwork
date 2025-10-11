import multer from 'multer';

// Configure storage strategy for multer. Using memory storage is best for Cloudinary upload.
const storage = multer.memoryStorage();

// --- Helper function for image file type validation ---
const fileFilterImage = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// --- Helper function for resume/document file type validation ---
const fileFilterDocument = (req, file, cb) => {
    // Check for PDF and PowerPoint types (PPT and PPTX)
    if (file.mimetype === 'application/pdf' || 
        file.mimetype === 'application/vnd.ms-powerpoint' || 
        file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF, PPT, or PPTX files are allowed for resumes!'), false);
    }
};

// 1. Multer instance for single file (Profile Picture)
const uploadSingle = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
    fileFilter: fileFilterImage,
});

// 2. Multer instance for multiple files (Achievement Photos)
const uploadMultiple = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024, files: 5 }, // 5MB limit per file, max 5 files
    fileFilter: fileFilterImage,
});

// 3. ⬅️ NEW MULTER INSTANCE for RESUME/DOCUMENT upload
const uploadDocument = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Increased size limit for documents (10MB)
    fileFilter: fileFilterDocument,
});

export { uploadSingle, uploadMultiple, uploadDocument };