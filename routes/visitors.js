const express = require('express');
const router = express.Router();
const VisitorCounter = require('../models/VisitorCounter'); // Adjust the path as needed

// @route   POST /api/visitors/increment
// @desc    Increments the site visitor counter and returns the new count
// @access  Public
router.post('/increment', async (req, res) => {
  try {
    const counter = await VisitorCounter.findOneAndUpdate(
      { name: 'siteVisitors' },
      { $inc: { count: 1 } },
      { new: true, upsert: true } // Creates the document if it doesn't exist
    );
    res.json({ count: counter.count });
  } catch (error) {
    console.error('Error incrementing visitor count:', error);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
