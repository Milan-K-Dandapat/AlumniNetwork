import jwt from 'jsonwebtoken';

/**
 * @file auth.js
 * This file contains all authentication and authorization middleware.
 * @function auth - (Default Export) Verifies a JWT token is present and valid.
 * Attaches the user's data (id, email, role) to req.user.
 * @function isAdmin - (Named Export) Checks if req.user.role is 'admin' OR 'superadmin'.
 * MUST be used *after* the 'auth' middleware.
 * @function isSuperAdmin - (Named Export) Checks if the user is the specific super admin.
 * MUST be used *after* the 'auth' middleware.
 */

// --- CONSISTENT SECRET DEFINITION (THE FIX) ---
// Define a single, consistent secret. Make sure this exact string 
// is used by your login route to SIGN the tokens.
const FALLBACK_SECRET = 'a8f5b1e3d7c2a4b6e8d9f0a1b3c5d7e9f2a4b6c8d0e1f3a5b7c9d1e3f5a7b9c1';

const getSecret = () => {
    // Priority: 1. Environment Variable, 2. Hardcoded Fallback
    const secret = process.env.JWT_SECRET || FALLBACK_SECRET;
    
    // IMPORTANT: Log the secret being used on the deployed server for debugging
    console.log(`Using JWT Secret: ${secret.substring(0, 5)}...`); 

    if (secret === FALLBACK_SECRET) {
        console.warn("⚠️ JWT_SECRET is not set in ENV. Using fallback secret for verification.");
    }
    return secret;
}

// --- 1. AUTHENTICATION (Verifies JWT) ---
const auth = (req, res, next) => {
    // 1. Get token from the 'Authorization' header
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        // 401: Client error, token missing
        return res.status(401).json({ msg: 'Authentication failed: No token provided.' });
    }

    try {
        const tokenParts = authHeader.split(' ');

        // 2. Validate token format (must be "Bearer <token>")
        if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
            return res.status(401).json({ msg: 'Authentication failed: Token format is invalid. Expected: Bearer <token>.' });
        }

        const token = tokenParts[1];
        const secretKey = getSecret(); // Get the consistent secret

        // 3. Verify the token using the consistent secret
        const decoded = jwt.verify(token, secretKey);

        // 4. Validate and attach user data from the token payload
        const userId = decoded._id || decoded.id;
        const userEmail = decoded.email;
        const userRole = decoded.role; 

        if (!userId || !userEmail || !userRole) {
            // 401: Token is valid but payload is malformed/incomplete
            return res.status(401).json({ msg: "Authentication failed: Token payload is missing required user fields (id, email, or role)." });
        }

        // Attach user object to the request
        req.user = {
            id: userId,
            _id: userId,
            email: userEmail,
            role: userRole 
        };

        // 5. Proceed to the next middleware or route handler
        next();

    } catch (err) {
        console.error("JWT Verification Error:", err.message);

        let errorMessage = 'Token is not valid.';
        if (err.name === 'TokenExpiredError') {
            errorMessage = 'Token expired. Please log in again.';
        } else if (err.name === 'JsonWebTokenError') {
            errorMessage = 'Invalid token signature. (Check JWT_SECRET consistency.)'; // Added helpful note
        }

        // 401: JWT verification failed for any reason
        res.status(401).json({ msg: `Authentication failed: ${errorMessage}` });
    }
};

// --- 2. AUTHORIZATION (Are you an Admin or Super Admin?) ---
export const isAdmin = (req, res, next) => {
    // Check 'req.user.role' which was attached by the 'auth' middleware
    const role = req.user?.role;
    
    if (role && (role === 'admin' || role === 'superadmin')) {
        next(); // User has sufficient privileges
    } else {
        // 403: User is logged in (passed 'auth') but lacks permission
        res.status(403).json({ msg: 'Authorization failed: Admin access required.' });
    }
};

// --- 3. AUTHORIZATION (Are you the designated Super Admin?) ---
export const isSuperAdmin = (req, res, next) => {
    // Retrieve the hardcoded/environmental Super Admin Email for the check
    // NOTE: This uses process.env.REACT_APP_SUPER_ADMIN_EMAIL which is a client-side variable. 
    // In a server environment, it should just be process.env.SUPER_ADMIN_EMAIL.
    const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'milankumar7770@gmail.com'; 

    const userEmail = req.user?.email;
    
    // Check both role (for safety) and email (for super admin identity)
    if (userEmail && userEmail === SUPER_ADMIN_EMAIL && req.user?.role === 'superadmin') {
        next(); // User is the designated Super Admin
    } else {
        // 403: User is logged in but is not the specific Super Admin
        res.status(403).json({ msg: 'Authorization failed: Super Admin access required.' });
    }
};

// Default export is the main 'auth' function
export default auth;
