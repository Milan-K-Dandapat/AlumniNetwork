import express from 'express';
import { getNetworkStats } from '../controllers/statsController.js';

const router = express.Router();

// This route will be public so it can be called from your homepage
// without requiring a user to be logged in.
router.get('/', getNetworkStats);

export default router;