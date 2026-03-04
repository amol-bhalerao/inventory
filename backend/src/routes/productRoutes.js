// Product Routes
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken } = require('../middleware/auth');
const validation = require('../middleware/validation');

// Create product
router.post('/', [
  body('sku').notEmpty().withMessage('SKU is required'),
  body('name').notEmpty().withMessage('Name is required')
], authenticateToken, validation, productController.create);

// Get all products
router.get('/', authenticateToken, productController.getAll);

// Get low stock products
router.get('/low-stock', authenticateToken, productController.getLowStock);

// Get product by ID
router.get('/:id', authenticateToken, productController.getById);

// Update product
router.put('/:id', authenticateToken, productController.update);

// Delete product
router.delete('/:id', authenticateToken, productController.delete);

module.exports = router;
