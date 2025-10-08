import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date, required: true },
  location: { type: String },
  priority: { type: String, default: 'Medium' },
  registrationLink: { type: String },

  // Pricing fields
  baseCost: { type: Number, default: 0 },
  guestCost: { type: Number, default: 0 },
  tShirtPrice: { type: Number, default: 0 },
  isFoodAvailable: { type: Boolean, default: false },
  currency: { type: String, default: 'INR' }, // optional

  // Registrations reference (optional)
  registrations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Registration'
  }],

  // Archive fields
  isArchived: { type: Boolean, default: false },
  photoLink: { type: String },
  videoLink: { type: String },
  resourceLink: { type: String },
}, { timestamps: true });

const Event = mongoose.model('Event', eventSchema);
export default Event;
