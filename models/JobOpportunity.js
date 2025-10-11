// models/JobOpportunity.js

import mongoose from 'mongoose';

const JobOpportunitySchema = new mongoose.Schema({
    // General Details
    title: { 
        type: String, 
        required: true,
        trim: true 
    },
    company: { 
        type: String, 
        required: true 
    },
    location: { 
        type: String, 
        required: true 
    },
    type: { 
        type: String, 
        enum: ['Job', 'Project'], 
        required: true 
    },
    salary: { 
        type: String, 
        default: 'Negotiable' 
    },
    description: { 
        type: String, 
        required: true 
    },
    skills: { 
        type: [String], 
        default: [] 
    },

    // Posting User Details (Assuming these come from req.user/token)
    posterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Alumni', // Link to the user who posted it
        // Note: You must ensure your authentication protects this route and provides the ID
    },
    posterName: { 
        type: String, 
        default: 'Alumnus' 
    },

}, { timestamps: true });

export default mongoose.model('JobOpportunity', JobOpportunitySchema);