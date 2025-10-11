// controllers/jobController.js

import JobOpportunity from '../models/JobOpportunity.js';

/**
 * @desc Get all job and project opportunities
 * @route GET /api/jobs/get-all
 * @access Public
 */
export const getAllJobs = async (req, res) => {
    try {
        const jobs = await JobOpportunity.find().sort({ createdAt: -1 });
        res.status(200).json(jobs);
    } catch (error) {
        console.error('Error fetching job opportunities:', error);
        res.status(500).json({ message: 'Server error while fetching jobs.' });
    }
};

/**
 * @desc Create a new job or project opportunity and broadcast it (REAL-TIME)
 * @route POST /api/jobs/post
 * @access Private (Requires authentication to get posterId/Name)
 */
export const postJob = async (req, res) => {
    // Note: Assuming req.user is populated by auth middleware
    const { 
        title, company, location, type, salary, description, skills 
    } = req.body;

    // Use dummy user data if auth middleware is not applied, otherwise use req.user
    const posterId = req.user?.id || null; 
    const posterName = req.user?.fullName || req.body.posterName || 'Alumnus';

    try {
        const newJob = new JobOpportunity({
            title,
            company,
            location,
            type,
            salary,
            description,
            skills,
            posterId,
            posterName
        });

        await newJob.save();
        
        // 🚨 CRITICAL: Emit Socket.IO event for real-time update
        if (req.io) {
            req.io.emit('newOpportunity', newJob);
            console.log(`Socket.IO broadcasted new job: ${newJob.title}`);
        }

        res.status(201).json({ 
            message: 'Opportunity posted and broadcasted successfully.', 
            job: newJob 
        });

    } catch (error) {
        console.error('Error posting job opportunity:', error);
        res.status(500).json({ message: 'Failed to post opportunity.' });
    }
};