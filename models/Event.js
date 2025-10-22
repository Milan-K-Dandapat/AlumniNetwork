import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
    // --- Core Event Fields ---
    title: { type: String, required: true },
    description: { type: String },
    date: { type: Date, required: true },
    time: { type: String }, // <--- 💡 ADD THIS FIELD for the time string
    location: { type: String },
    priority: { type: String, default: 'Medium' },
    registrationLink: { type: String },

    // --- Pricing Fields ---
    baseCost: { type: Number, default: 0 },
    guestCost: { type: Number, default: 0 },
    tShirtPrice: { type: Number, default: 0 },
    isFoodAvailable: { type: Boolean, default: false },
    currency: { type: String, default: 'INR' },

    // --- Rich Content Fields (For Detail Page Editor) ---
    imageUrl: { type: String },
    agenda: { type: String },
    organizer: { type: String },
    contactEmail: { type: String },

    // --- Registrations reference (optional) ---
    registrations: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Registration'
    }],

    // --- Archive Fields ---
    isArchived: { type: Boolean, default: false },
    photoLink: { type: String },
    videoLink: { type: String },
    resourceLink: { type: String },
    externalGalleryUrl: { type: String }, // <--- 💡 ADD THIS FIELD for the detail editor/archive panel
}, { timestamps: true });

const Event = mongoose.model('Event', eventSchema);
export default Event;