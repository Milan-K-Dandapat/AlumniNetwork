// middleware/auth.js

import jwt from 'jsonwebtoken';

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
        
        // 2. Validate token format
        if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
            return res.status(401).json({ msg: 'Token format is invalid. Expected: Bearer <token>.' });
        }
        
        const token = tokenParts[1];

        // 3. Verify the token
        const decoded = jwt.verify(token, getSecret());

        // 4. Extract user ID, email, and CRITICALLY, the verification status
        const userId = decoded._id || decoded.id; 
        const userEmail = decoded.email; 
        const isVerified = decoded.isVerified; // <--- 🚨 NEW: Extracting isVerified flag

        if (!userId || !userEmail) {
            throw new Error("Token payload is missing the required user ID ('id' or '_id') or email field."); 
        }

        // 5. Attach a comprehensive user object to the request.
        // The `isUserVerifiedMiddleware` relies on the `isVerified` field being here.
        req.user = { 
            id: userId, 
            _id: userId, 
            email: userEmail,
            isVerified: isVerified // <--- 🚨 NEW: Attaching isVerified to req.user
        }; 
        
        // 6. Proceed to the next middleware
        next(); 

    } catch (err) {
        // 7. Error handling 
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

export default auth;