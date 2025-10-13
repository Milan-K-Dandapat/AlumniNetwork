import jwt from 'jsonwebtoken';

const getSecret = () => {
    return process.env.JWT_SECRET || 'a8f5b1e3d7c2a4b6e8d9f0a1b3c5d7e9f2a4b6c8d0e1f3a5b7c9d1e3f5a7b9c1'; 
}

const auth = (req, res, next) => {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        const tokenParts = authHeader.split(' ');
        
        if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
             return res.status(401).json({ msg: 'Token format is invalid (Expected: Bearer <token>), authorization denied' });
        }
        
        const token = tokenParts[1];

        const decoded = jwt.verify(token, getSecret());

        // 🛑 CRITICAL FIX: Attach the decoded ID to the expected _id property.
        // If your JWT payload uses 'id' (most common), use decoded.id.
        // If your JWT payload uses '_id', use decoded._id.
        // We will assume your payload uses 'id' and map it to '_id' for Mongoose/Express consistency.
        
        req.user = { _id: decoded.id }; // Assuming JWT payload field is 'id'
        
        // If you were previously fetching the entire user object from DB (e.g., const user = await Alumni.findById(decoded.id)), 
        // using just the ID is efficient and sufficient for your controller's needs.
        
        next(); 
    } catch (err) {
        console.error("JWT Verification Error:", err.message);
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

export default auth;