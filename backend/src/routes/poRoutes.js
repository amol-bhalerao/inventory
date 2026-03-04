// Purchase Order Routes
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const poController = require('../controllers/poController');
const { authenticateToken } = require('../middleware/auth');
const validation = require('../middleware/validation');

// Create purchase order
router.post('/', [
  body('supplierId').notEmpty().withMessage('Supplier ID is required'),
  body('poDate').notEmpty().withMessage('PO date is required'),
  body('items').isArray().withMessage('Items must be an array')
], authenticateToken, validation, poController.create);

// Get all purchase orders
router.get('/', authenticateToken, poController.getAll);

// Get PO by ID
router.get('/:id', authenticateToken, poController.getById);

// Update purchase order
router.put('/:id', authenticateToken, poController.update);

// Update PO status
router.patch('/:id/status', [
  body('status').notEmpty().withMessage('Status is required')
], authenticateToken, validation, poController.updateStatus);

// Delete purchase order
router.delete('/:id', authenticateToken, poController.delete);

module.exports = router;
