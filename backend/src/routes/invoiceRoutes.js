// Invoice Routes
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticateToken } = require('../middleware/auth');
const validation = require('../middleware/validation');

// Create invoice
router.post('/', [
  body('invoiceDate').notEmpty().withMessage('Invoice date is required'),
  body('items').isArray().withMessage('Items must be an array')
], authenticateToken, validation, invoiceController.create);

// Get all invoices
router.get('/', authenticateToken, invoiceController.getAll);

// Get revenue report
router.get('/report/revenue', authenticateToken, invoiceController.getRevenueReport);

// Get invoice by ID
router.get('/:id', authenticateToken, invoiceController.getById);

// Update invoice
router.put('/:id', authenticateToken, invoiceController.update);

// Delete invoice
router.delete('/:id', authenticateToken, invoiceController.delete);

module.exports = router;
