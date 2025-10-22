import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
    // --- Core Event Fields ---
    title: { type: String, required: true },
    description: { type: String }, // Used for short description or default long description
    date: { type: Date, required: true },
    time: { type: String }, // 💡 ADDED: Time field used in Admin forms
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
    imageUrl: { type: String }, // For the banner/photo upload (Cloudinary URL)
    agenda: { type: String }, // For structured agenda/topics content
    organizer: { type: String }, // Organizer Name
    contactEmail: { type: String }, // Organizer Contact Email

    // --- Registrations reference (optional) ---
    registrations: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Registration'
    }],

    // --- Archive Fields ---
    isArchived: { type: Boolean, default: false },
    photoLink: { type: String }, // Archive Photo Gallery Link
    videoLink: { type: String }, // Archive Video Link
    resourceLink: { type: String }, // Archive Resource Link
    
    // 💡 ADDED: External Gallery Link for Past Events button
    externalGalleryUrl: { type: String }, 

}, { timestamps: true });

const Event = mongoose.model('Event', eventSchema);
export default Event;