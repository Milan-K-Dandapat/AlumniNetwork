import jwt from 'jsonwebtoken';

/**
 * @file auth.js
 * This file contains all authentication and authorization middleware.
 * * @function auth - (Default Export) Verifies a JWT token is present and valid.
 * Attaches the user's data (id, email, role) to req.user.
 * * @function isAdmin - (Named Export) Checks if req.user.role is 'admin' OR 'superadmin'.
 * MUST be used *after* the 'auth' middleware.
 * * @function isSuperAdmin - (Named Export) Checks if the user is the specific super admin.
 * MUST be used *after* the 'auth' middleware.
 */

// Fetches the JWT secret from environment variables
const getSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.warn("⚠️ JWT_SECRET is not set in environment variables. Using fallback secret.");
        return 'a8f5b1e3d7c2a4b6e8d9f0a1b3c5d7e9f2a4b6c8d0e1f3a5b7c9d1e3f5a7b9c1';
    }
    return secret;
}

// --- 1. AUTHENTICATION (Are you logged in?) ---
// This is your main 'auth' function, which verifies the token.
const auth = (req, res, next) => {
    // 1. Get token from the 'Authorization' header
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        return res.status(401).json({ msg: 'No token found in Authorization header, access denied.' });
    }

    try {
        const tokenParts = authHeader.split(' ');

        // 2. Validate token format
        if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
            return res.status(401).json({ msg: 'Token format is invalid. Expected: Bearer <token>.' });
        }

        const token = tokenParts[1];

        // 3. Verify the token
        const decoded = jwt.verify(token, getSecret());

        // 4. Extract user ID, email, and role from the token payload
        const userId = decoded._id || decoded.id;
        const userEmail = decoded.email;
        const userRole = decoded.role; // This is the crucial field

        if (!userId || !userEmail || !userRole) {
            throw new Error("Token payload is missing required fields (id, email, or role).");
        }

        // 5. Attach user object to the request for the *next* middleware to use.
        req.user = {
            id: userId,
            _id: userId,
            email: userEmail,
            role: userRole 
        };

        // 6. Proceed to the next middleware (e.g., isAdmin or the route handler)
        next();

    } catch (err) {
        // 7. Error handling
        console.error("JWT Verification Error:", err.message);

        let errorMessage = 'Token is not valid.';
        if (err.name === 'TokenExpiredError') {
            errorMessage = 'Token expired. Please log in again.';
        } else if (err.name === 'JsonWebTokenError') {
            errorMessage = 'Invalid token signature.';
        }

        res.status(401).json({ msg: `Authentication failed: ${errorMessage}` });
    }
};

// --- 2. AUTHORIZATION (Are you an Admin?) ---
// This is the NEW function you need to add.
// It runs *after* 'auth' and checks the role.
export const isAdmin = (req, res, next) => {
    
    // We can check 'req.user.role' because the 'auth' middleware (which ran first) added it.
    if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
        next(); // User is an admin or superadmin, proceed
    } else {
        // User is logged in but is not an admin
        res.status(403).json({ msg: 'Not authorized. Admin access required.' });
    }
};

// --- 3. AUTHORIZATION (Are you the Super Admin?) ---
// This is your existing 'isSuperAdmin' function.
// It also runs *after* 'auth'.
export const isSuperAdmin = (req, res, next) => {
    const SUPER_ADMIN_EMAIL = 'milankumar7770@gmail.com'; // Or get from process.env

    if (req.user && req.user.email === SUPER_ADMIN_EMAIL) {
        next(); // User is the super admin, proceed
    } else {
        res.status(403).json({ msg: 'Not authorized. Super admin access required.' });
    }
};

// Default export is the main 'auth' function
export default auth;