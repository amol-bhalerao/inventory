// Stock Transactions Controller
const StockTransaction = require('../models/StockTransaction');
const Product = require('../models/Product');
const { sendSuccess, sendError } = require('../utils/response');

// Record stock transaction
exports.create = async (req, res) => {
  try {
    const { productId, transactionType, quantityChange, referenceId, referenceType, notes } = req.body;

    if (!productId || !transactionType || !quantityChange) {
      return sendError(res, 'Product ID, transaction type, and quantity change are required', 400);
    }

    const validTypes = ['purchase', 'sale', 'adjustment', 'return'];
    if (!validTypes.includes(transactionType)) {
      return sendError(res, 'Invalid transaction type', 400);
    }

    // Check product exists
    const product = await Product.findById(productId);
    if (!product) {
      return sendError(res, 'Product not found', 404);
    }

    // Create transaction
    const transaction = await StockTransaction.create({
      franchiseId: req.user.franchiseId,
      productId,
      transactionType,
      quantityChange,
      referenceId,
      referenceType,
      notes,
      createdBy: req.user.id
    });

    // Update product stock
    await Product.updateStock(productId, quantityChange);

    sendSuccess(res, 'Stock transaction recorded successfully', transaction, 201);
  } catch (error) {
    console.error('Create stock transaction error:', error);
    sendError(res, error.message || 'Failed to record transaction', 500);
  }
};

// Get transaction history by product
exports.getByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const transactions = await StockTransaction.findByProduct(productId, limit, offset);

    sendSuccess(res, 'Transactions retrieved successfully', { transactions });
  } catch (error) {
    console.error('Get transactions error:', error);
    sendError(res, error.message || 'Failed to get transactions', 500);
  }
};

// Get all transactions for franchise
exports.getAll = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const filters = {
      transactionType: req.query.transactionType,
      productId: req.query.productId
    };

    const transactions = await StockTransaction.findByFranchise(req.user.franchiseId, limit, offset, filters);

    sendSuccess(res, 'Transactions retrieved successfully', { transactions });
  } catch (error) {
    console.error('Get all transactions error:', error);
    sendError(res, error.message || 'Failed to get transactions', 500);
  }
};

// Get product movement report
exports.getMovementReport = async (req, res) => {
  try {
    const { productId, startDate, endDate } = req.query;

    if (!productId || !startDate || !endDate) {
      return sendError(res, 'Product ID, start date, and end date are required', 400);
    }

    const report = await StockTransaction.getProductMovement(productId, startDate, endDate);

    sendSuccess(res, 'Movement report retrieved successfully', report);
  } catch (error) {
    console.error('Get movement report error:', error);
    sendError(res, error.message || 'Failed to get movement report', 500);
  }
};
