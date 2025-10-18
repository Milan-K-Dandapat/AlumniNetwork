// middleware/auth.js

import jwt from 'jsonwebtoken';

// --- SUPER ADMIN ID ---
// This is your unique User ID. Only this user can verify profiles.
const SUPER_ADMIN_ID = '68e76cba9d609b03a689ab29';

const getSecret = () => {
   // Fetches the secret from environment variables or uses a fallback
    return process.env.JWT_SECRET || 'a8f5b1e3d7c2a4b6e8d9f0a1b3c5d7e9f2a4b6c8d0e1f3a5b7c9d1e3f5a7b9c1'; 
}

const auth = (req, res, next) => {
    // 1. Get token from the 'Authorization' header
    const authHeader = req.header('Authorization');

     if (!authHeader) {
        return res.status(401).json({ msg: 'No token found in Authorization header, access denied.' });
    }

    try {
        const tokenParts = authHeader.split(' ');
        
        // 2. Validate token format (must be "Bearer <token>")
        if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
             return res.status(401).json({ msg: 'Token format is invalid. Expected: Bearer <token>.' });
        }
        
        const token = tokenParts[1];

        // 3. Verify the token signature
        const decoded = jwt.verify(token, getSecret());

        // 4. CRITICAL FIX: Extract user ID defensively
        // Checks for '_id' (Mongoose default) or 'id' (common JWT payload name)
        const userId = decoded._id || decoded.id; 
        
        if (!userId) {
            // If the token is valid but doesn't contain a user ID field, stop the request.
            throw new Error("Token payload is missing the required user ID field ('id' or '_id')."); 
        }

        // 5. Attach the user ID to the request object for use in controllers
        // The controller expects req.user._id
        req.user = { _id: userId }; 
        
        // 6. Proceed to the next middleware (Multer/Controller)
        next(); 

    } catch (err) {
        // 7. FINAL FIX: Handle all JWT verification and logic errors with a clean JSON response
        console.error("JWT Verification Error:", err.message);
        
        let errorMessage = 'Token is not valid.';
        if (err.name === 'TokenExpiredError') {
             errorMessage = 'Token expired. Please log in again.';
        } else if (err.name === 'JsonWebTokenError') {
             errorMessage = 'Invalid token signature.';
        } else {
             // Use the detailed error message for defensive checking (e.g., "missing user ID")
             errorMessage = err.message; 
        }

        res.status(401).json({ msg: `Authentication failed: ${errorMessage}` });
    }
};

// --- NEW FUNCTION ---
// This middleware checks if the logged-in user is the Super Admin
export const isSuperAdmin = (req, res, next) => {
    // We check req.user._id because the 'auth' middleware above adds it.
    if (req.user && req.user._id === SUPER_ADMIN_ID) {
        // User is the Super Admin, proceed
        next();
    } else {
         // User is logged in but NOT the Super Admin
        res.status(403).json({ msg: 'Forbidden. Admin access required.' });
    }
};

export default auth;