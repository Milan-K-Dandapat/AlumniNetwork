import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Configure Cloudinary using credentials from environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

/**
 * Uploads a local file path (temp multer file) to Cloudinary.
 * @param {string} filePath - The temporary path of the file to upload.
 * @param {string} folder - The folder name in Cloudinary (e.g., 'profile_pics').
 * @returns {Promise<string>} The secure URL of the uploaded image.
 */
const uploadToCloudinary = async (filePath, folder) => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder: `alumniconnect/${folder}`, // Use a parent folder for organization
            transformation: [
                { quality: "auto:low" }, // Optimize image quality
                { fetch_format: "auto" }
            ],
        });
        return result.secure_url;
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        throw new Error("Image upload failed.");
    }
};

export { cloudinary, uploadToCloudinary };
