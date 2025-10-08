import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
import auth from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/gallery/:folderPath
// @desc    Fetches all images/videos from a specified Cloudinary folder path
// @access  Private
router.get('/:folderPath', auth, async (req, res) => {
    // Decode the folder path from the URL
    const encodedFolderPath = req.params.folderPath;
    const folderPath = decodeURIComponent(encodedFolderPath); 

    if (!folderPath) {
        return res.status(400).json({ message: 'Cloudinary folder path is required.' });
    }

    try {
        // --- FINAL FIX: REMOVED THE INVALID .with_field('secure_url') PARAMETER ---
        const expression = `folder=${folderPath}`;
        
        const result = await cloudinary.search
            .expression(expression) // Use the standard folder search expression
            // .with_field('secure_url') <-- THIS LINE CRASHED THE API, IT IS REMOVED
            .max_results(200)
            .execute();

        // Filter out resources that are not images or videos and extract secure_url
        const galleryUrls = result.resources
            .filter(r => r.resource_type === 'image' || r.resource_type === 'video')
            .map(r => r.secure_url); // secure_url is returned by default by the search API

        // Logging to verify success
        console.log(`Cloudinary API Success: Found ${result.total_count} assets in folder: ${folderPath}`);

        if (galleryUrls.length === 0) {
            console.warn(`No filtered media found, though total_count was ${result.total_count}`);
            return res.json({ message: 'No assets found in folder.', urls: [] });
        }

        res.json({
            message: 'Gallery links fetched successfully.',
            urls: galleryUrls
        });
    } catch (error) {
        console.error('Cloudinary Gallery Fetch Failure:', error);
        res.status(500).json({ message: 'Server failed to fetch gallery resources (Check API permissions).' });
    }
});

export default router;
