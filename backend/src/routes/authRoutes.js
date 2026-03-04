// Auth Routes
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const validation = require('../middleware/validation');

// Register
router.post('/register', [
  body('username').notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('franchiseId').notEmpty().withMessage('Franchise ID is required'),
  body('roleId').notEmpty().withMessage('Role ID is required')
], validation, authController.register);

// Login
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], validation, authController.login);

// Logout
router.post('/logout', authenticateToken, authController.logout);

// Get Profile
router.get('/profile', authenticateToken, authController.getProfile);

// Change Password
router.post('/change-password', [
  body('oldPassword').notEmpty().withMessage('Old password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  body('confirmPassword').notEmpty().withMessage('Confirm password is required')
], authenticateToken, validation, authController.changePassword);

// Refresh Token
router.post('/refresh-token', authenticateToken, [
  body('refreshToken').notEmpty().withMessage('Refresh token is required')
], validation, authController.refreshToken);

module.exports = router;
