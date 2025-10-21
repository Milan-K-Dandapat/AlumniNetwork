import jwt from 'jsonwebtoken';

const getSecret = () => {
    // Fetches the secret from environment variables or uses a fallback
    return process.env.JWT_SECRET || 'a8f5b1e3d7c2a4b6e8d9f0a1b3c5d7e9f2a4b6c8d0e1f3a5b7c9d1e3f5a7b9c1'; 
}

// --- YOUR EXISTING AUTH FUNCTION (Unchanged) ---
// This function will run first to verify the user is logged in.
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

        // 4. Extract user ID and email
        // We look for MongoDB's default (_id) or a general ID (id)
        const userId = decoded._id || decoded.id; 
        const userEmail = decoded.email; 

        if (!userId || !userEmail) {
            throw new Error("Token payload is missing the required user ID ('id' or '_id') or email field."); 
        }

        // 5. Attach user object to the request. 
        // We set both `id` and `_id` to ensure compatibility with Mongoose (.id) and older controllers (_id).
        // The `email` is crucial for the Super Admin check.
        req.user = { id: userId, _id: userId, email: userEmail }; 
        
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

// --- NEW isSuperAdmin FUNCTION (Added) ---
// This function will run *after* the 'auth' function on specific routes.
// It checks the req.user object that the 'auth' function created.
export const isSuperAdmin = (req, res, next) => {
    const SUPER_ADMIN_EMAIL = 'milankumar7770@gmail.com';
    
    // We can check req.user because the 'auth' middleware already added it.
    if (req.user && req.user.email === SUPER_ADMIN_EMAIL) {
        next(); // User is the super admin, proceed
    } else {
        res.status(403); // 403 Forbidden
        throw new Error('Not authorized. Super admin access required.');
    }
};



export default auth;