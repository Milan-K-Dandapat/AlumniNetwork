import multer from 'multer';

// Configure storage strategy for multer. Using memory storage is best for Cloudinary upload.
const storage = multer.memoryStorage();

// Multer instance for single file (Profile Picture)
const uploadSingle = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Multer instance for multiple files (Achievement Photos)
const uploadMultiple = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024, files: 5 }, // 5MB limit per file, max 5 files
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

export { uploadSingle, uploadMultiple };
