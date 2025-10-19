import jwt from 'jsonwebtoken';

// The Super Admin's email, used to gate sensitive routes.
const SUPER_ADMIN_EMAIL = 'milankumar7770@gmail.com';

const getSecret = () => {
    // Fetches the secret from environment variables or uses a fallback
    return process.env.JWT_SECRET || 'a8f5b1e3d7c2a4b6e8d9f0a1b3c5d7e9f2a4b6c8d0e1f3a5b7c9d1e3f5a7b9c1'; 
}

// --------------------------------------------------------
// 1. PROTECT (Your original 'auth' function logic)
// Ensures the user is logged in and attaches user info to req.user
// --------------------------------------------------------
export const protect = (req, res, next) => {
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

        // 4. Extract user ID and email
        const userId = decoded._id || decoded.id; 
        const userEmail = decoded.email; 

        if (!userId || !userEmail) {
            throw new Error("Token payload is missing the required user ID ('id' or '_id') or email field."); 
        }

        // 5. Attach a comprehensive user object to the request.
        // This is crucial for subsequent middleware (like superAdminCheck)
        req.user = { id: userId, _id: userId, email: userEmail }; 
        
        // 6. Proceed to the next middleware
        next(); 

    } catch (err) {
        // 7. Error handling (unchanged)
        console.error("JWT Verification Error:", err.message);
        
        let errorMessage = 'Token is not valid.';
        if (err.name === 'TokenExpiredError') {
             errorMessage = 'Token expired. Please log in again.';
        } else if (err.name === 'JsonWebTokenError') {
             errorMessage = 'Invalid token signature.';
        } else {
             errorMessage = err.message; 
        }

        res.status(401).json({ msg: `Authentication failed: ${errorMessage}` });
    }
};

// --------------------------------------------------------
// 2. REQUIRED NEW MIDDLEWARE: superAdminCheck
// Ensures the authenticated user is the Super Admin
// --------------------------------------------------------
export const superAdminCheck = (req, res, next) => {
    // We rely on the 'protect' middleware running first, setting req.user.email
    if (!req.user || req.user.email !== SUPER_ADMIN_EMAIL) {
        // Log who tried to access the route for security
        console.warn(`Unauthorized access attempt by email: ${req.user?.email || 'Unknown'}`);
        return res.status(403).json({ 
            msg: 'Access denied. You do not have super administrator privileges.' 
        });
    }

    // If the email matches the Super Admin, allow access
    next();
};

// Export both functions (your original export logic is removed, replaced by named exports)
