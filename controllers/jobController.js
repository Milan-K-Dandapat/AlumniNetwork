import Job from '../models/Job.js';
import Alumni from '../models/Alumni.js';

// --- POST Job/Project ---
export const createJobPost = async (req, res) => {
    const userId = req.user?._id;
    const { title, company, location, description, salaryRange, contactEmail, type } = req.body;
    
    if (!userId) {
        return res.status(401).json({ success: false, message: 'Not authorized.' });
    }

    try {
        // Fetch the poster's name for display on the job card
        const alumni = await Alumni.findById(userId).select('fullName');
        if (!alumni) {
            return res.status(404).json({ success: false, message: 'Posting user not found.' });
        }
        
        const newJob = new Job({
            userId,
            posterName: alumni.fullName,
            title,
            company,
            location,
            description,
            salaryRange,
            contactEmail,
            type,
        });

        await newJob.save();

        // Optional: Emit Socket.IO event for real-time update if io is configured in server.js
        if (req.io) {
            const jobs = await Job.find().sort({ createdAt: -1 });
            req.io.emit('jobsUpdate', jobs); // Emit the new list of jobs
        }

        res.status(201).json({ success: true, message: 'Job posted successfully!', job: newJob });

    } catch (error) {
        console.error('Error creating job post:', error);
        // Handle MongoDB validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
    }
};

// --- GET All Job/Projects ---
export const getAllJobPosts = async (req, res) => {
    try {
        // Fetch all jobs, sorted newest first
        const jobs = await Job.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: jobs });
    } catch (error) {
        console.error('Error fetching job posts:', error);
        res.status(500).json({ success: false, message: 'Error fetching job posts.' });
    }
};

// =========================================================================
// ⭐ NEW: UPDATE Job/Project (PUT) ⭐
// =========================================================================

export const updateJobPost = async (req, res) => {
    const userId = req.user?._id; // User ID from the auth middleware (the editor)
    const jobId = req.params.id;
    const updates = req.body;

    if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    try {
        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).json({ success: false, message: 'Job post not found.' });
        }

        // ⭐ AUTHORIZATION CHECK: Must be the original poster ⭐
        if (job.userId.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: 'You are not authorized to edit this post.' });
        }

        // Update fields dynamically, excluding non-editable ones (like userId)
        Object.keys(updates).forEach(key => {
            if (job[key] !== undefined && key !== 'userId') {
                job[key] = updates[key];
            }
        });

        const updatedJob = await job.save();

        // 🚀 Emit Socket.IO event for real-time update
        if (req.io) {
            const jobs = await Job.find().sort({ createdAt: -1 });
            req.io.emit('jobsUpdate', jobs); // Emit the new list of jobs
        }

        res.status(200).json({ success: true, message: 'Job post updated successfully!', job: updatedJob });

    } catch (error) {
        console.error('Error updating job post:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'An unexpected server error occurred during update.' });
    }
};

// =========================================================================
// ⭐ NEW: DELETE Job/Project (DELETE) ⭐
// =========================================================================

export const deleteJobPost = async (req, res) => {
    const userId = req.user?._id; // User ID from the auth middleware (the deleter)
    const jobId = req.params.id;   // Job ID from the URL parameter

    if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    try {
        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).json({ success: false, message: 'Job post not found.' });
        }

        // ⭐ AUTHORIZATION CHECK: Must be the original poster ⭐
        if (job.userId.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: 'You are not authorized to delete this post.' });
        }

        // Perform deletion
        await Job.deleteOne({ _id: jobId }); 

        // 🚀 Emit Socket.IO event for real-time update
        if (req.io) {
            const jobs = await Job.find().sort({ createdAt: -1 });
            req.io.emit('jobsUpdate', jobs); // Emit the new list of jobs
        }

        res.status(200).json({ success: true, message: 'Job post deleted successfully!' });

    } catch (error) {
        console.error('Error deleting job post:', error);
        res.status(500).json({ success: false, message: 'An unexpected server error occurred during deletion.' });
    }
};