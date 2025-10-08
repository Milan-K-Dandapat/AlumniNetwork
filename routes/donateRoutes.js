const express = require('express');
const router = express.Router();

// Import the controller function
const { createDonationOrder } = require('../controllers/donateController');

// Define the route for creating a donation order
// It will be accessible at POST /api/donate/create-order
router.post('/create-order', createDonationOrder);

module.exports = router;