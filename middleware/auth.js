import jwt from 'jsonwebtoken';

const auth = (req, res, next) => {
    // Get token from the Authorization header
    const authHeader = req.header('Authorization');

    // Check if token exists
    if (!authHeader) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        // The token is sent as "Bearer <token>", so we split and get the second part
        const token = authHeader.split(' ')[1];

        if (!token) {
             return res.status(401).json({ msg: 'Token format is invalid, authorization denied' });
        }

        // Verify the token using the secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Add the user's payload (which contains their ID) to the request object
        req.user = decoded; 
        next(); // Proceed to the next step (the route handler)
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

export default auth;