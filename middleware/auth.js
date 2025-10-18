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
        
        // 2. Validate token format (must be "Bearer <token>")
        if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
             return res.status(401).json({ msg: 'Token format is invalid. Expected: Bearer <token>.' });
        }
        
        const token = tokenParts[1];

        // 3. Verify the token signature
        const decoded = jwt.verify(token, getSecret());

        // 4. Extract user ID (this was correct)
        const userId = decoded._id || decoded.id; 
        
        // --- ⬇️ THIS IS THE FIX ⬇️ ---
        // 5. Extract email from the token payload
        const userEmail = decoded.email; 
        // --- ⬆️ THIS IS THE FIX ⬆️ ---

        if (!userId || !userEmail) { // Check for both ID and Email
            // If the token is valid but doesn't contain required fields, stop the request.
            throw new Error("Token payload is missing the required user ID ('id' or '_id') or email field."); 
        }

        // --- ⬇️ THIS IS THE FIX ⬇️ ---
        // 6. Attach BOTH id and email to the request object
        // NOTE: We attach 'id' (no underscore) because that's what server.js now expects
        req.user = { id: userId, email: userEmail }; 
        // --- ⬆️ THIS IS THE FIX ⬆️ ---
        
        // 7. Proceed to the next middleware
        next(); 

    } catch (err) {
        // 8. Error handling (unchanged)
        console.error("JWT Verification Error:", err.message);
        
        let errorMessage = 'Token is not valid.';
        if (err.name === 'TokenExpiredError') {
             errorMessage = 'Token expired. Please log in again.';
        } else if (err.name === 'JsonWebTokenError') {
             errorMessage = 'Invalid token signature.';
        } else {
             // Use the detailed error message (e.g., "missing user ID or email")
             errorMessage = err.message; 
        }

        res.status(401).json({ msg: `Authentication failed: ${errorMessage}` });
    }
};

export default auth;