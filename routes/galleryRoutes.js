import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
const router = express.Router();

router.get('/:folderPath', async (req, res) => { 
    const encodedFolderPath = req.params.folderPath;
    const folderPath = decodeURIComponent(encodedFolderPath); 

    if (!folderPath) {
        return res.status(400).json({ message: 'Cloudinary folder path is required.' });
    }

    try {

        const expression = `folder=${folderPath}`;
        
        const result = await cloudinary.search
            .expression(expression) 
            .max_results(200)
            .execute();

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
        res.status(500).json({ message: 'Server failed to fetch gallery resources (Check Cloudinary credentials or folder name).' });
    }
});

export default router;
