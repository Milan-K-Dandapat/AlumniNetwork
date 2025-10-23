// generate_token.js (CJS format for reliable execution)

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
// 💡 IMPORTANT: Load the environment variables from your project's .env file
// If your .env is in the root, you might need dotenv.config({ path: '../.env' });
// Assuming standard configuration:
dotenv.config(); 

// --- CONFIGURATION: Match these to your environment and authController.js ---

// Fallback secret must match the one in your auth.js and authController.js
const SECRET = process.env.JWT_SECRET || 'a8f5b1e3d7c2a4b6e8d9f0a1b3c5d7e9f2a4b6c8d0e1f3a5b7c9d1e3f5a7b9c1';

// This email MUST match the SUPER_ADMIN_USER_EMAIL defined in your frontend and backend.
const SUPER_ADMIN_EMAIL = process.env.REACT_APP_SUPER_ADMIN_EMAIL || process.env.SUPER_ADMIN_EMAIL || 'milankumar7770@gmail.com';

// Use a consistent mock ID (must be a valid 24-character hex string)
const SUPER_ADMIN_MOCK_ID = '65d1d94f271923a4b6c8d0e1'; 

// --- PAYLOAD: This is the data your backend checks ---
const payload = {
    id: SUPER_ADMIN_MOCK_ID,
    email: SUPER_ADMIN_EMAIL,
    role: 'superadmin' // CRITICAL: This role passes the isAdmin/isSuperAdmin middleware
};

// Generate the token with a very long expiry (365 days)
const token = jwt.sign(payload, SECRET, { expiresIn: '365d' }); 

console.log("========================================");
console.log("      🚀 STATIC SUPER ADMIN TOKEN 🚀    ");
console.log("========================================");
console.log(token);
console.log("========================================");