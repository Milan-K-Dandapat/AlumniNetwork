// controllers/careerProfileController.js

import CareerProfile from '../models/CareerProfile.js';

export const saveCareerProfile = async (req, res) => {
    // Get the user ID attached by your 'auth.js' middleware
    const userId = req.user?._id; 
    
    // Security check: Ensure a user ID is present
    if (!userId) {
        // If auth middleware didn't attach user, this is a critical failure.
        // Also, we must ensure the `auth` middleware is working correctly.
        return res.status(401).json({ success: false, message: 'Not authorized. User ID not found in token.' });
    }

    // --- CRITICAL FIX 1: Parse the JSON String from FormData ---
    let parsedProfileData;
    try {
        // req.body.profileData is the JSON string sent from the client
        // Multer handles text fields, putting them in req.body
        if (!req.body.profileData) {
            return res.status(400).json({ success: false, message: 'Missing career profile data in request body.' });
        }
        
        parsedProfileData = JSON.parse(req.body.profileData);

        // Convert the stringified arrays back to arrays
        if (parsedProfileData.keySkills && typeof parsedProfileData.keySkills === 'string') {
            parsedProfileData.keySkills = JSON.parse(parsedProfileData.keySkills);
        }
        if (parsedProfileData.preferredLocations && typeof parsedProfileData.preferredLocations === 'string') {
            parsedProfileData.preferredLocations = JSON.parse(parsedProfileData.preferredLocations);
        }

    } catch (parseError) {
        console.error('Error parsing profileData JSON:', parseError);
        return res.status(400).json({ success: false, message: 'Invalid format for profile data.' });
    }

    // --- CRITICAL FIX 2: Handle Resume File from Multer (req.file) ---
    const fileInfo = {};
    if (req.file) {
        // Multer successfully uploaded the file and its info is in req.file
        fileInfo.resumePath = req.file.path; // The local path where the file is stored
        fileInfo.resumeFilename = req.file.filename;
        fileInfo.resumeUploadedAt = new Date();
    } else {
        // If no file was sent, check if they explicitly chose to upload later
        if (parsedProfileData.uploadLater) {
             fileInfo.resumePath = 'upload_later'; // A special value to indicate manual entry later
        } else {
            // For now, if no file and no 'uploadLater', we don't save a path.
        }
    }
    
    // Combine profile data with file info and user ID
    const dataToSave = {
        ...parsedProfileData,
        ...fileInfo,
        userId: userId,
    };
    
    // Clean up temporary client-side flags before saving
    delete dataToSave.resumeFile;   // This was the File object on the client, remove it
    delete dataToSave.uploadLater; // This was the client flag, remove it

    try {
        // Find a profile by the user's ID and update it, or create a new one (`upsert: true`).
        const updatedProfile = await CareerProfile.findOneAndUpdate(
            { userId: userId },
            dataToSave, // Use the prepared dataToSave object
            { 
                new: true,         // Return the updated document
                upsert: true,      // Create if it doesn't exist
                runValidators: true // Run schema validations
            }
        ).lean(); // Use .lean() for faster query if you don't need mongoose document methods later

        // Ensure the profile is not null after upsert
        if (!updatedProfile) {
            return res.status(500).json({ success: false, message: 'Profile could not be created or updated.' });
        }
        
        console.log(`Profile for user ${userId} saved successfully.`);

        // Send a successful response
        res.status(200).json({ 
            success: true,
            message: 'Career profile saved successfully and profile created!', 
            // Return the necessary data to the client to update their state
            data: updatedProfile 
        });

    } catch (error) {
        console.error('Error saving career profile:', error.message);
        
        // Handle specific validation errors from the model
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        
        // Handle Multer errors (e.g., file size limit exceeded, wrong file type)
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: 'File too large. Max size is 5MB.' });
        }
        
        // Handle any other server-side errors
        res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
    }
};