import jwt from 'jsonwebtoken';

// Super Admin Email for Authorization Check
const SUPER_ADMIN_EMAIL = 'milankumar7770@gmail.com';

const getSecret = () => {
    // Fetches the secret from environment variables or uses a fallback
    return process.env.JWT_SECRET || 'a8f5b1e3d7c2a4b6e8d9f0a1b3c5d7e9f2a4b6c8d0e1f3a5b7c9d1e3f5a7b9c1'; 
}

// 1. Authentication Middleware (protects routes, extracts user info)
export const protect = (req, res, next) => {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        return res.status(401).json({ msg: 'No token found in Authorization header, access denied.' });
    }

    try {
        const tokenParts = authHeader.split(' ');
        
        if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
            return res.status(401).json({ msg: 'Token format is invalid. Expected: Bearer <token>.' });
        }
        
        const token = tokenParts[1];
        const decoded = jwt.verify(token, getSecret());

        const userId = decoded._id || decoded.id; 
        const userEmail = decoded.email; 

        if (!userId || !userEmail) {
            throw new Error("Token payload is missing the required user ID or email field."); 
        }

        // Attach user info to the request for subsequent middleware/controllers
        req.user = { id: userId, _id: userId, email: userEmail }; 
        
        next(); 

    } catch (err) {
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

// 2. Authorization Middleware (checks for Super Admin privileges)
export const checkSuperAdmin = (req, res, next) => {
    // Assumes 'protect' middleware has run and attached req.user
    if (!req.user || req.user.email !== SUPER_ADMIN_EMAIL) {
        return res.status(403).json({ message: 'Forbidden: Super Admin access required for this operation.' });
    }
    next();
};
