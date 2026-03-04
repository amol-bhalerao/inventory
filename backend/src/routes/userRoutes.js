// User Routes
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole, authorizeFranchise } = require('../middleware/authorization');
const validation = require('../middleware/validation');

// Create user
router.post('/', [
  body('firstname').notEmpty().withMessage('First name is required'),
  body('lastname').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('franchiseId').notEmpty().withMessage('Franchise ID is required'),
  body('role').notEmpty().withMessage('Role is required')
], authenticateToken, authorizeRole('Super Admin', 'Franchise Owner'), validation, userController.create);

// Get all users (Super Admin only)
router.get('/', authenticateToken, authorizeRole('Super Admin'), userController.getAll);

// Get users by franchise (Must come before /:id to avoid route conflicts)
router.get('/franchise/:franchiseId', authenticateToken, authorizeFranchise, userController.getByFranchise);

// Get user by ID (After specific routes to avoid conflicts)
router.get('/:id', authenticateToken, userController.getById);

// Update user
router.put('/:id', [
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().notEmpty().withMessage('Role must not be empty'),
  body('franchiseId').optional().notEmpty().withMessage('Franchise ID must not be empty')
], authenticateToken, authorizeRole('Super Admin', 'Franchise Owner'), validation, userController.update);

// Delete user
router.delete('/:id', authenticateToken, authorizeRole('Super Admin', 'Franchise Owner'), userController.delete);

// Deactivate user (Must come before /:id/activate to avoid conflicts)
router.patch('/:id/deactivate', authenticateToken, userController.deactivate);

// Activate user
router.patch('/:id/activate', authenticateToken, userController.activate);

module.exports = router;
