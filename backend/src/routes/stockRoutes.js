// Stock/Inventory Routes
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const stockController = require('../controllers/stockController');
const { authenticateToken } = require('../middleware/auth');
const validation = require('../middleware/validation');

// Record stock transaction
router.post('/', [
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('transactionType').notEmpty().withMessage('Transaction type is required'),
  body('quantityChange').notEmpty().withMessage('Quantity change is required')
], authenticateToken, validation, stockController.create);

// Get all transactions
router.get('/', authenticateToken, stockController.getAll);

// Get transactions by product
router.get('/product/:productId', authenticateToken, stockController.getByProduct);

// Get movement report
router.get('/report/movement', authenticateToken, stockController.getMovementReport);

module.exports = router;
