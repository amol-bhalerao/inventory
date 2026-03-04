// Customer Routes
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/authorization');
const validation = require('../middleware/validation');

// Create customer
router.post('/', [
    body('name').notEmpty().withMessage('Customer name is required'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('phone').optional().isLength({ min: 10 }).withMessage('Valid phone number is required'),
    body('gst_number').optional({ checkFalsy: true }).matches(/^[0-9A-Z]{15}$/).withMessage('GST number must be 15 characters (alphanumeric) if provided')
], authenticateToken, authorizeRole('Franchise Owner', 'Manager', 'Staff'), validation, customerController.create);

// Get all customers
router.get('/', authenticateToken, customerController.getAll);

// Get customer by GST number
router.get('/gst/:gst_number', authenticateToken, customerController.getByGST);

// Get customer by ID
router.get('/:id', authenticateToken, customerController.getById);

// Update customer
router.put('/:id', [
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('phone').optional().isLength({ min: 10 }).withMessage('Valid phone number is required'),
    body('gst_number').optional({ checkFalsy: true }).matches(/^[0-9A-Z]{15}$/).withMessage('GST number must be 15 characters (alphanumeric) if provided')
], authenticateToken, authorizeRole('Franchise Owner', 'Manager', 'Staff'), validation, customerController.update);

// Delete customer
router.delete('/:id', authenticateToken, authorizeRole('Franchise Owner', 'Manager'), customerController.delete);

module.exports = router;
