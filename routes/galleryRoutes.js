import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
// Removed: import auth from '../middleware/auth.js'; // Removed if authentication is handled outside
// Note: If you have an index router file, ensure 'auth' is not applied globally.

const router = express.Router();

// @route   GET /api/gallery/:folderPath
// @desc    Fetches all images/videos from a specified Cloudinary folder path
// @access  Public (Authentication middleware 'auth' is REMOVED for public access)
router.get('/:folderPath', async (req, res) => { // Removed 'auth' middleware here
    // Decode the folder path from the URL
    const encodedFolderPath = req.params.folderPath;
    const folderPath = decodeURIComponent(encodedFolderPath); 

    if (!folderPath) {
        return res.status(400).json({ message: 'Cloudinary folder path is required.' });
    }

    try {
        // Use the standard folder search expression
        const expression = `folder=${folderPath}`;
        
        const result = await cloudinary.search
            .expression(expression) 
            .max_results(200)
            .execute();

        // Filter out resources that are not images or videos and extract secure_url
        const galleryUrls = result.resources
            .filter(r => r.resource_type === 'image' || r.resource_type === 'video')
            .map(r => r.secure_url);

        console.log(`Cloudinary API Success: Found ${galleryUrls.length} public assets in folder: ${folderPath}`);

        if (galleryUrls.length === 0) {
            return res.json({ message: 'No assets found in folder.', urls: [] });
        }

        res.json({
            message: 'Gallery links fetched successfully.',
            urls: galleryUrls
        });
    } catch (error) {
        console.error('Cloudinary Gallery Fetch Failure:', error);
        // Ensure this error is not returning sensitive info
        res.status(500).json({ message: 'Server failed to fetch gallery resources (Check Cloudinary credentials or folder name).' });
    }
});

export default router;
