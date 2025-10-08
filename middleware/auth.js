import jwt from 'jsonwebtoken';

/**
 * Middleware to verify a JSON Web Token (JWT) provided in the Authorization header.
 * If valid, it attaches the decoded user payload to req.user and calls next().
 * If invalid or missing, it returns a 401 Unauthorized response.
 */
const auth = (req, res, next) => {
    // 1. Get token from the Authorization header (e.g., "Bearer <token>")
    const authHeader = req.header('Authorization');

    // 2. Check if the Authorization header exists
    if (!authHeader) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        // 3. Extract the token part (splitting "Bearer <token>")
        const tokenParts = authHeader.split(' ');
        
        if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
             return res.status(401).json({ msg: 'Token format is invalid (Expected: Bearer <token>), authorization denied' });
        }
        
        const token = tokenParts[1];

        // 4. Verify the token using the secret key
        // NOTE: Ensure process.env.JWT_SECRET is correctly loaded in your server.js
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 5. Add the user's payload (ID) to the request object
        req.user = decoded; 
        
        // 6. Proceed to the next middleware or route handler
        next(); 
    } catch (err) {
        // This block catches JWT verification failures (e.g., token expired, invalid signature)
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

export default auth;
