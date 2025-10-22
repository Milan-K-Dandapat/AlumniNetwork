import express from 'express';
import RegistrationPayment from '../models/RegistrationPayment.js';
import Event from '../models/Event.js';
// 💡 CRITICAL FIX: Import controllers from authController.js
import { 
    adminRegister, 
    adminLogin, 
    handleGetAllUsers, 
    handleUpdateUserRole, 
    handleGetAllPendingAdmins, 
    handleApproveAdmin, 
    handleRejectAdmin 
} from '../controllers/authController.js'; // <-- CORRECTED PATH

// Import Auth Middleware
import auth, { isAdmin, isSuperAdmin } from '../middleware/auth.js'; 

const router = express.Router();

// =========================================================
// 1. ADMIN AUTHENTICATION (For Frontend Login Page)
// =========================================================

/**
 * @route  POST /api/admin/register
 * @desc   Register a new Admin account (pending approval)
 * @access Public
 */
router.post('/register', adminRegister);

/**
 * @route  POST /api/admin/login
 * @desc   Login a registered Admin account
 * @access Public
 */
router.post('/login', adminLogin);

// =========================================================
// 2. PENDING ADMIN MANAGEMENT (Super Admin Only)
// =========================================================

/**
 * @route  GET /api/admin/pending
 * @desc   Get all pending (unverified/isVerified: false) admin accounts
 * @access Private/Super Admin
 */
router.get('/pending', [auth, isSuperAdmin], handleGetAllPendingAdmins);

/**
 * @route  PATCH /api/admin/approve/:id
 * @desc   Approve a pending admin account
 * @access Private/Super Admin
 */
router.patch('/approve/:id', [auth, isSuperAdmin], handleApproveAdmin);

/**
 * @route  DELETE /api/admin/reject/:id
 * @desc   Delete a pending admin account
 * @access Private/Super Admin
 */
router.delete('/reject/:id', [auth, isSuperAdmin], handleRejectAdmin);


// =========================================================
// 3. GENERAL USER ROLE MANAGEMENT (Super Admin Only)
// =========================================================

/**
 * @route  GET /api/admin/users/all
 * @desc   Get all user accounts (for Super Admin Role Manager)
 * @access Private/Super Admin
 */
router.get('/users/all', [auth, isSuperAdmin], handleGetAllUsers);

/**
 * @route  PATCH /api/admin/users/:id/role
 * @desc   Update a user's role (user <-> admin)
 * @access Private/Super Admin
 */
router.patch('/users/:id/role', [auth, isSuperAdmin], handleUpdateUserRole);


// =========================================================
// 4. REGISTRATION/EVENT DATA RETRIEVAL (Admin Access)
// (Your original working routes - added middleware)
// =========================================================

/**
 * @route  GET /api/admin/registered-events
 * @desc   Get a list of unique events that have successful registrations
 * @access Private/Admin
 */
router.get('/registered-events', [auth, isAdmin], async (req, res) => { 
    try {
        const registeredEvents = await RegistrationPayment.aggregate([
            { $match: { paymentStatus: 'success' } },
            {
                $group: {
                    _id: '$eventId',
                    eventTitle: { $first: '$eventTitle' },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    eventId: '$_id',
                    eventTitle: 1,
                    count: 1
                }
            },
            { $sort: { eventTitle: 1 } }
        ]);
        res.json(registeredEvents);
    } catch (error) {
        console.error('Error fetching registered events:', error);
        res.status(500).json({ message: 'Server Error during aggregation' });
    }
});


/**
 * @route  GET /api/admin/registrations/:eventId
 * @desc   Get all successful registrations for a specific event
 * @access Private/Admin
 */
router.get('/registrations/:eventId', [auth, isAdmin], async (req, res) => { 
    try {
        const { eventId } = req.params;
        if (!eventId) {
            return res.status(400).json({ message: 'Event ID is required' });
        }

        const registrations = await RegistrationPayment.find({ 
            eventId: eventId,
            paymentStatus: 'success' 
        }).sort({ createdAt: -1 });

        res.json(registrations);
    } catch (error) {
        console.error('Error fetching event registrations:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;