import mongoose from 'mongoose';

const VisitorCounterSchema = new mongoose.Schema({
  // A unique name to identify this specific counter, ensuring we only have one document for it.
  name: {
    type: String,
    required: true,
    unique: true,
    default: 'siteVisitors' // This is the identifier for your main site counter.
  },
  count: {
    type: Number,
    default: 0, // The counter will start at 0 when first created.
  },
});

// Export the Mongoose model using the ES module 'export default' syntax.
export default mongoose.model('VisitorCounter', VisitorCounterSchema);

