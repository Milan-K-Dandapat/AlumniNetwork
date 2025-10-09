import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
    // General Project Details
    title: { 
        type: String, 
        required: true, 
        trim: true,
        maxlength: [100, 'Title cannot be more than 100 characters']
    },
    description: { 
        type: String, 
        required: true,
        maxlength: [500, 'Description cannot be more than 500 characters']
    },
    
    // Ownership and Origin
    owner: { 
        type: String, 
        required: true, 
        trim: true,
        description: "Name of the alumnus/alumna who started the project."
    },
    
    // Status and Collaboration Details
    status: {
        type: String,
        enum: ['Needs Collaborators', 'In Progress', 'Completed'],
        default: 'Needs Collaborators',
        required: true
    },
    rolesNeeded: {
        type: [String], // Array of strings (e.g., ['UX Designer', 'Frontend Dev'])
        default: []
    },
    expressers: {
        type: Number,
        default: 0
    },
    
    // Metadata
    image: {
        type: String,
        default: 'https://placehold.co/400x200/0F172A/88B0B0?text=NEW+PROJECT'
    },
    datePosted: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const Project = mongoose.model('Project', projectSchema);

export default Project;
