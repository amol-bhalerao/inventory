// Purchase Bill Routes
const express = require('express');
const { body } = require('express-validator');
const multer = require('multer');
const router = express.Router();
const purchaseBillController = require('../controllers/purchaseBillController');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRole } = require('../middleware/authorization');
const validation = require('../middleware/validation');

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Extract items and supplier details from PDF (must be before /:id routes)
router.post('/extract/pdf', authenticateToken, authorizeRole('Franchise Owner', 'Manager'), upload.single('file'), purchaseBillController.extractFromPDF);

// Create purchase bill
router.post('/', [
    body('bill_date').isISO8601().withMessage('Valid bill date is required'),
    body('items').isArray().withMessage('Items must be an array'),
    body('items.*.item_name').notEmpty().withMessage('Item name is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('items.*.rate').isDecimal().withMessage('Rate must be a valid number')
], authenticateToken, authorizeRole('Franchise Owner', 'Manager'), validation, purchaseBillController.create);

// Get all purchase bills
router.get('/', authenticateToken, purchaseBillController.getAll);

// Get purchase bill by ID
router.get('/:id', authenticateToken, purchaseBillController.getById);

// Update purchase bill
router.put('/:id', [
    body('items').optional().isArray().withMessage('Items must be an array'),
    body('items.*.item_name').optional().notEmpty().withMessage('Item name is required'),
    body('items.*.quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('items.*.rate').optional().isDecimal().withMessage('Rate must be a valid number')
], authenticateToken, authorizeRole('Franchise Owner', 'Manager'), validation, purchaseBillController.update);

// Approve and apply purchase bill (update stock)
router.patch('/:id/approve', authenticateToken, authorizeRole('Franchise Owner', 'Manager'), purchaseBillController.approve);

// Delete purchase bill
router.delete('/:id', authenticateToken, authorizeRole('Franchise Owner', 'Manager'), purchaseBillController.delete);

module.exports = router;
