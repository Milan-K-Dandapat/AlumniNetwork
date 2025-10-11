const mongoose = require('mongoose');

const VisitorCounterSchema = new mongoose.Schema({
  // A unique name to identify this specific counter
  name: {
    type: String,
    required: true,
    unique: true,
    default: 'siteVisitors'
  },
  count: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model('VisitorCounter', VisitorCounterSchema);