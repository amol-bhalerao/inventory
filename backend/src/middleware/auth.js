// JWT Authentication Middleware
const jwt = require('jsonwebtoken');
const config = require('../config/app');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const generateToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
};

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.refreshExpiresIn });
};

module.exports = {
  authenticateToken,
  generateToken,
  generateRefreshToken
};
