const express = require('express');
const router = express.Router();
const { saveDonation, createOrder } = require('../controllers/donationController'); // Import both

// This is the new route we created in the frontend:
router.post('/save-donation', saveDonation); 

// (Optional) Your existing route to create the order:
// router.post('/create-order', createOrder); 

module.exports = router;