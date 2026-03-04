// Quotation Routes
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const quotationController = require('../controllers/quotationController');
const { authenticateToken } = require('../middleware/auth');
const validation = require('../middleware/validation');

// Create quotation
router.post('/', [
    body('quotationDate').notEmpty().withMessage('Quotation date is required'),
    body('customerName').notEmpty().withMessage('Customer name is required'),
    body('quotationType').isIn(['with_rates', 'without_rates']).withMessage('Invalid quotation type')
], authenticateToken, validation, quotationController.create);

// Get all quotations
router.get('/', authenticateToken, quotationController.getAll);

// Get quotation by ID
router.get('/:id', authenticateToken, quotationController.getById);

// Update quotation
router.put('/:id', authenticateToken, quotationController.update);

// Change quotation status
router.patch('/:id/status', [
    body('status').isIn(['draft', 'sent', 'accepted', 'rejected']).withMessage('Invalid status')
], authenticateToken, validation, quotationController.changeStatus);

// Convert quotation to invoice
router.post('/:id/convert-to-invoice', [
    body('invoiceNumber').notEmpty().withMessage('Invoice number is required'),
    body('invoiceDate').notEmpty().withMessage('Invoice date is required')
], authenticateToken, validation, quotationController.convertToInvoice);

// Delete quotation
router.delete('/:id', authenticateToken, quotationController.delete);

// Add item to quotation
router.post('/:id/items', [
    body('productName').notEmpty().withMessage('Product name is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('unitPrice').isDecimal().withMessage('Unit price must be a valid number')
], authenticateToken, validation, quotationController.addItem);

// Update quotation item
router.put('/:id/items/:itemId', authenticateToken, quotationController.updateItem);

// Delete quotation item
router.delete('/:id/items/:itemId', authenticateToken, quotationController.deleteItem);

module.exports = router;
