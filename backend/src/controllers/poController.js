// Purchase Order Controller
const PurchaseOrder = require('../models/PurchaseOrder');
const { query } = require('../utils/database');
const { sendSuccess, sendError } = require('../utils/response');
const { generatePONumber, calculateTotals } = require('../utils/helpers');

// Create purchase order
exports.create = async (req, res) => {
  try {
    const { supplierId, poDate, deliveryDate, items, notes } = req.body;

    if (!supplierId) {
      return sendError(res, 'Supplier ID is required', 400);
    }

    if (!items || items.length === 0) {
      return sendError(res, 'Purchase order must have at least one item', 400);
    }

    // Calculate totals
    const { subtotal, totalTax, total } = calculateTotals(items);

    // Generate PO number
    const poNumber = generatePONumber(req.user.franchiseId);

    const po = await PurchaseOrder.create({
      franchiseId: req.user.franchiseId,
      poNumber,
      supplierId,
      poDate,
      deliveryDate,
      subtotal,
      taxAmount: totalTax,
      totalAmount: total,
      notes,
      createdBy: req.user.id
    });

    // Add PO items
    const itemsInsertSQL = 'INSERT INTO purchase_order_items (purchase_order_id, product_id, product_name, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?, ?)';
    
    for (const item of items) {
      const lineTotal = (item.quantity * item.unitPrice);
      await query(itemsInsertSQL, [
        po.id,
        item.productId || null,
        item.productName,
        item.quantity,
        item.unitPrice,
        lineTotal
      ]);
    }

    sendSuccess(res, 'Purchase order created successfully', po, 201);
  } catch (error) {
    console.error('Create PO error:', error);
    sendError(res, error.message || 'Failed to create purchase order', 500);
  }
};

// Get purchase orders
exports.getAll = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const filters = {
      status: req.query.status,
      supplierId: req.query.supplierId
    };

    const pos = await PurchaseOrder.findByFranchise(req.user.franchiseId, limit, offset, filters);

    sendSuccess(res, 'Purchase orders retrieved successfully', { pos });
  } catch (error) {
    console.error('Get POs error:', error);
    sendError(res, error.message || 'Failed to get purchase orders', 500);
  }
};

// Get PO by ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const po = await PurchaseOrder.findById(id);

    if (!po) {
      return sendError(res, 'Purchase order not found', 404);
    }

    sendSuccess(res, 'Purchase order retrieved successfully', po);
  } catch (error) {
    console.error('Get PO error:', error);
    sendError(res, error.message || 'Failed to get purchase order', 500);
  }
};

// Update PO
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryDate, notes } = req.body;

    const po = await PurchaseOrder.update(id, {
      deliveryDate,
      notes
    });

    if (!po) {
      return sendError(res, 'Purchase order not found', 404);
    }

    sendSuccess(res, 'Purchase order updated successfully', po);
  } catch (error) {
    console.error('Update PO error:', error);
    sendError(res, error.message || 'Failed to update purchase order', 500);
  }
};

// Update PO status
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['draft', 'submitted', 'confirmed', 'received', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return sendError(res, 'Invalid status', 400);
    }

    await PurchaseOrder.updateStatus(id, status);

    const po = await PurchaseOrder.findById(id);

    if (!po) {
      return sendError(res, 'Purchase order not found', 404);
    }

    sendSuccess(res, 'Purchase order status updated successfully', po);
  } catch (error) {
    console.error('Update PO status error:', error);
    sendError(res, error.message || 'Failed to update purchase order status', 500);
  }
};

// Delete PO
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const po = await PurchaseOrder.findById(id);

    if (!po) {
      return sendError(res, 'Purchase order not found', 404);
    }

    await PurchaseOrder.delete(id);

    sendSuccess(res, 'Purchase order deleted successfully');
  } catch (error) {
    console.error('Delete PO error:', error);
    sendError(res, error.message || 'Failed to delete purchase order', 500);
  }
};
