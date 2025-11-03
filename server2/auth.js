// Authentication utilities for token generation and verification

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '7d'; // Token expires in 7 days

function generateToken(userId, email) {
  const payload = {
    userId,
    email
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

function extractTokenFromCookie(cookieHeader) {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').map(c => c.trim());
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=');
    if (name === 'token') {
      return decodeURIComponent(value);
    }
  }
  return null;
}

function extractTokenFromHeader(authHeader) {
  if (!authHeader) return null;
  
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

module.exports = {
  generateToken,
  verifyToken,
  extractTokenFromCookie,
  extractTokenFromHeader,
  JWT_SECRET
};

