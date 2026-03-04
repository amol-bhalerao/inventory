// Supplier Routes
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { authenticateToken } = require('../middleware/auth');
const validation = require('../middleware/validation');

// Create supplier
router.post('/', [
  body('name').notEmpty().withMessage('Supplier name is required')
], authenticateToken, validation, supplierController.create);

// Get all suppliers
router.get('/', authenticateToken, supplierController.getAll);

// Search suppliers
router.get('/search', authenticateToken, supplierController.search);

// Get supplier by ID
router.get('/:id', authenticateToken, supplierController.getById);

// Update supplier
router.put('/:id', authenticateToken, supplierController.update);

// Delete supplier
router.delete('/:id', authenticateToken, supplierController.delete);

module.exports = router;
