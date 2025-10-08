import express from 'express';
import Contact from '../models/Contact.model.js'; 

const router = express.Router();

// @route   POST /api/contact/submit
// @desc    Receives data from the frontend form and saves it to MongoDB
// @access  Public
router.post('/submit', async (req, res) => {
    const { name, email, phone, subject, message } = req.body;

    // Basic Input Validation: Ensure required fields are present
    if (!name || !email || !subject || !message) {
        return res.status(400).json({ 
            success: false, 
            message: 'Please fill all required fields (Name, Email, Subject, Message).' 
        });
    }

    try {
        const newInquiry = new Contact({
            name,
            email,
            phone,
            subject,
            message,
        });

        // Attempt to save the new inquiry document
        await newInquiry.save();

        // Send successful response back to the frontend
        res.status(201).json({ 
            success: true, 
            message: 'Success! Your inquiry has been recorded.',
            inquiryId: newInquiry._id
        });

    } catch (err) {
        console.error("MongoDB Save Error (Contact Form):", err.message);
        
        // Handle Mongoose Validation Errors (e.g., if email format is wrong or required field is missing)
        if (err.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: "Validation error: Please check your input format." });
        }

        // Generic server error response
        res.status(500).json({ 
            success: false, 
            message: 'Server error: Failed to process submission. Please try again later.' 
        });
    }
});

export default router;
