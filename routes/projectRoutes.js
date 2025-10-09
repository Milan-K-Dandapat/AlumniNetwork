import express from 'express';
import Project from '../models/Project.js'; // Assumed Mongoose Model
// NOTE: Assuming middleware imports here if needed:
// import { protect, admin } from '../middleware/authMiddleware.js'; 

const router = express.Router();

// --- Public Route for the Careers Page ---

/**
 * @route   GET /api/projects/all
 * @desc    Get all projects for public display
 * @access  Public
 */
router.get('/all', async (req, res) => {
    try {
        const projects = await Project.find().sort({ datePosted: -1 });
        res.json(projects);
    } catch (error) {
        console.error('Error fetching all projects:', error);
        res.status(500).json({ message: 'Server Error fetching projects' });
    }
});


// --- Admin Routes for Persistence ---

/**
 * @route   POST /api/projects
 * @desc    Create a new project (ADMIN)
 * @access  Private
 */
router.post('/', async (req, res) => {
    // NOTE: Apply authentication middleware here
    try {
        const newProject = new Project(req.body);
        const savedProject = await newProject.save(); // Save to database

        // 🚀 CRITICAL: Emit WebSocket event to force frontend sync
        if (req.io) {
            req.io.emit('project_list_updated');
            console.log('--- Socket.IO: Emitted update after project POST ---');
        }
        
        res.status(201).json(savedProject);
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ message: 'Failed to create project.' });
    }
});

/**
 * @route   PUT /api/projects/:id
 * @desc    Update an existing project (ADMIN)
 * @access  Private
 */
router.put('/:id', async (req, res) => {
    // NOTE: Apply authentication middleware here
    try {
        const projectId = req.params.id; 
        
        const updatedProject = await Project.findByIdAndUpdate(
            projectId, 
            req.body, 
            { new: true, runValidators: true }
        );

        if (!updatedProject) {
            return res.status(404).json({ message: 'Project not found.' });
        }
        
        // 🚀 CRITICAL: Emit WebSocket event
        if (req.io) {
            req.io.emit('project_list_updated');
            console.log('--- Socket.IO: Emitted update after project PUT ---');
        }

        res.json(updatedProject);
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ message: 'Failed to update project.' });
    }
});

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete a project (ADMIN)
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
    // NOTE: Apply authentication middleware here
    try {
        const projectId = req.params.id; 
        const result = await Project.findByIdAndDelete(projectId);

        if (!result) {
            return res.status(404).json({ message: 'Project not found.' });
        }
        
        // 🚀 CRITICAL: Emit WebSocket event
        if (req.io) {
            req.io.emit('project_list_updated');
            console.log('--- Socket.IO: Emitted update after project DELETE ---');
        }

        res.json({ message: 'Project deleted successfully.' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ message: 'Failed to delete project.' });
    }
});

export default router;
    
