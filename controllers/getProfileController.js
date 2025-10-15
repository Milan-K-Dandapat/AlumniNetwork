import CareerProfile from '../models/CareerProfile.js';

export const getCareerProfile = async (req, res) => {
    // User ID is attached by the 'auth' middleware
    const userId = req.user?._id; 
    
    if (!userId) {
        return res.status(401).json({ success: false, message: 'Not authorized.' });
    }

    try {
        const profile = await CareerProfile.findOne({ userId: userId }).lean();

        if (!profile) {
            // Return 404 if profile doesn't exist, which the client handles by starting the builder
            return res.status(404).json({ success: false, message: 'Profile not found.' });
        }

        // Return the saved profile data
        res.status(200).json({ 
            success: true,
            data: profile 
        });

    } catch (error) {
        console.error('Error fetching career profile:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching profile.' });
    }
};
