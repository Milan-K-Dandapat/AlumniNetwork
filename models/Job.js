import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
    // Link to the Alumni user who posted the job
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Alumni', 
        required: true,
    },
    posterName: {
        type: String,
        required: true,
    },
    // Job/Project details
    type: { // Job, Internship, Project, Freelance
        type: String,
        enum: ['Job', 'Internship', 'Project', 'Freelance'],
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    company: {
        type: String,
        required: true,
    },
    location: { // E.g., Bangalore, Remote
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    salaryRange: {
        type: String, // E.g., 10-15 LPA
        default: 'Negotiable',
    },
    contactEmail: {
        type: String,
        required: true,
    },
    // Real-time metadata
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.model('Job', jobSchema);
