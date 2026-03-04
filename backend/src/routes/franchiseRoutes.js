// Franchise Routes
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const franchiseController = require('../controllers/franchiseController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/authorization');
const validation = require('../middleware/validation');

// Create franchise (Super Admin only)
router.post('/', [
  body('name').notEmpty().withMessage('Franchise name is required'),
  body('email').isEmail().withMessage('Valid email is required')
], authenticateToken, authorizeRole('Super Admin'), validation, franchiseController.create);

// Get all franchises (Super Admin only)
router.get('/', authenticateToken, authorizeRole('Super Admin'), franchiseController.getAll);

// Get franchise by ID
router.get('/:id', authenticateToken, franchiseController.getById);

// Update franchise
router.put('/:id', authenticateToken, franchiseController.update);

// Delete franchise (Super Admin only)
router.delete('/:id', authenticateToken, authorizeRole('Super Admin'), franchiseController.delete);

// Change app name (whitelabel)
router.patch('/:id/app-name', [
  body('appName').notEmpty().withMessage('App name is required')
], authenticateToken, authorizeRole('Super Admin'), validation, franchiseController.changeAppName);

module.exports = router;
