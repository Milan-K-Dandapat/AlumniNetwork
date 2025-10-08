import mongoose from 'mongoose';

const ContactSchema = new mongoose.Schema({
    // Name is required
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
    },
    // Email is required
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
    },
    // Phone is optional
    phone: {
        type: String,
        trim: true,
    },
    // Subject is required
    subject: {
        type: String,
        required: [true, 'Subject is required'],
        trim: true,
    },
    // Message body is required
    message: {
        type: String,
        required: [true, 'Message is required'],
    },
    // Timestamp for when the inquiry was created
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, { collection: 'inquiries' }); // Explicitly uses the 'inquiries' collection

const Contact = mongoose.model('ContactInquiry', ContactSchema);

export default Contact;
