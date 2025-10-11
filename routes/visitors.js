import express from 'express';
const router = express.Router();

// Import the VisitorCounter model using ES Module syntax.
import VisitorCounter from '../models/VisitorCounter.js';

// @route   POST /api/visitors/increment
// @desc    Increments the counter and broadcasts the new count.
// @access  Public
router.post('/increment', async (req, res) => {
  try {
    const counter = await VisitorCounter.findOneAndUpdate(
      { name: 'siteVisitors' },
      { $inc: { count: 1 } },
      { new: true, upsert: true }
    );
    
    // ✅ REAL-TIME UPDATE:
    // Broadcast the new count to all connected clients via Socket.io.
    if (req.io) {
      req.io.emit('visitorCountUpdated', { count: counter.count });
    }

    // Send the response to the user who just loaded the page.
    res.json({ count: counter.count });

  } catch (error) {
    console.error('Error incrementing visitor count:', error);
    res.status(500).send('Server Error');
  }
});

export default router;