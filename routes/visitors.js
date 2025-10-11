import express from 'express';
const router = express.Router();

// Import the VisitorCounter model using ES Module syntax.
// The '.js' extension is crucial for this module system to work correctly in Node.js.
import VisitorCounter from '../models/VisitorCounter.js';

router.post('/increment', async (req, res) => {
  try {
   const counter = await VisitorCounter.findOneAndUpdate(
     { name: 'siteVisitors' },
      { $inc: { count: 1 } },
      { new: true, upsert: true }
    );
    
   
    res.json({ count: counter.count });

  } catch (error) {
    
    console.error('Error incrementing visitor count:', error);
    res.status(500).send('Server Error');
  }
});

export default router;

