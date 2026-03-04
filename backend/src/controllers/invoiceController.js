// Invoice Controller
const Invoice = require('../models/Invoice');
const StockTransaction = require('../models/StockTransaction');
const Product = require('../models/Product');
const { query } = require('../utils/database');
const { sendSuccess, sendError } = require('../utils/response');
const { generateInvoiceNumber, calculateTotals } = require('../utils/helpers');

// Create invoice
exports.create = async (req, res) => {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      customerCity,
      customerState,
      customerPostalCode,
      customerGst,
      invoiceDate,
      dueDate,
      items,
      notes
    } = req.body;

    if (!items || items.length === 0) {
      return sendError(res, 'Invoice must have at least one item', 400);
    }

    // Calculate totals
    const { subtotal, totalTax, total } = calculateTotals(items);

    // Generate invoice number - now async
    const invoiceNumber = await generateInvoiceNumber(req.user.franchiseId);

    const invoice = await Invoice.create({
      franchiseId: req.user.franchiseId,
      invoiceNumber,
      invoiceDate,
      dueDate,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      customerCity,
      customerState,
      customerPostalCode,
      customerGst,
      subtotal,
      taxAmount: totalTax,
      totalAmount: total,
      notes,
      createdBy: req.user.id
    });

    // Add invoice items and create stock transactions
    const itemsInsertSQL = 'INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price, tax_rate, line_total) VALUES (?, ?, ?, ?, ?, ?, ?)';

    for (const item of items) {
      const lineTotal = (item.quantity * item.unitPrice);
      await query(itemsInsertSQL, [
        invoice.id,
        item.productId || null,
        item.productName,
        item.quantity,
        item.unitPrice,
        item.taxRate || 0,
        lineTotal
      ]);

      // Create stock transaction for sale (negative quantity)
      if (item.productId) {
        try {
          const stockTransaction = await StockTransaction.create({
            franchiseId: req.user.franchiseId,
            productId: item.productId,
            transactionType: 'sale',
            quantityChange: -item.quantity, // Negative for sale
            referenceId: invoice.id,
            referenceType: 'invoice',
            notes: `Sale via Invoice #${invoice.invoiceNumber}`,
            createdBy: req.user.id
          });

          // Update product stock
          await Product.updateStock(item.productId, -item.quantity);
        } catch (stockError) {
          console.error('Error creating stock transaction:', stockError);
          // Continue with invoice creation even if stock transaction fails
        }
      }
    }

    sendSuccess(res, 'Invoice created successfully', invoice, 201);
  } catch (error) {
    console.error('Create invoice error:', error);
    sendError(res, error.message || 'Failed to create invoice', 500);
  }
};

// Get invoices
exports.getAll = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const filters = {
      paymentStatus: req.query.paymentStatus,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    const invoices = await Invoice.findByFranchise(req.user.franchiseId, limit, offset, filters);

    sendSuccess(res, 'Invoices retrieved successfully', { invoices });
  } catch (error) {
    console.error('Get invoices error:', error);
    sendError(res, error.message || 'Failed to get invoices', 500);
  }
};

// Get invoice by ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return sendError(res, 'Invoice not found', 404);
    }

    sendSuccess(res, 'Invoice retrieved successfully', invoice);
  } catch (error) {
    console.error('Get invoice error:', error);
    sendError(res, error.message || 'Failed to get invoice', 500);
  }
};

// Update invoice
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerName, customerEmail, customerPhone, customerAddress, dueDate, notes, paymentStatus } = req.body;

    const invoice = await Invoice.update(id, {
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      dueDate,
      notes,
      paymentStatus
    });

    if (!invoice) {
      return sendError(res, 'Invoice not found', 404);
    }

    sendSuccess(res, 'Invoice updated successfully', invoice);
  } catch (error) {
    console.error('Update invoice error:', error);
    sendError(res, error.message || 'Failed to update invoice', 500);
  }
};

// Delete invoice
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return sendError(res, 'Invoice not found', 404);
    }

    // Get invoice items to reverse stock transactions
    const invoiceItems = await query('SELECT * FROM invoice_items WHERE invoice_id = ?', [id]);

    // Reverse stock transactions for each item
    for (const item of invoiceItems) {
      if (item.product_id) {
        try {
          // Create reversal stock transaction
          await StockTransaction.create({
            franchiseId: req.user.franchiseId,
            productId: item.product_id,
            transactionType: 'return',
            quantityChange: item.quantity, // Positive to reverse the sale
            referenceId: id,
            referenceType: 'invoice_return',
            notes: `Reversal of Invoice #${invoice.invoiceNumber}`,
            createdBy: req.user.id
          });

          // Restore product stock
          await Product.updateStock(item.product_id, item.quantity);
        } catch (stockError) {
          console.error('Error reversing stock transaction:', stockError);
          // Continue with invoice deletion even if stock reversal fails
        }
      }
    }

    await Invoice.delete(id);

    sendSuccess(res, 'Invoice deleted successfully and stock reversed');
  } catch (error) {
    console.error('Delete invoice error:', error);
    sendError(res, error.message || 'Failed to delete invoice', 500);
  }
};

// Get revenue report
exports.getRevenueReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return sendError(res, 'Start date and end date are required', 400);
    }

    const report = await Invoice.getRevenue(req.user.franchiseId, startDate, endDate);

    sendSuccess(res, 'Revenue report retrieved successfully', report);
  } catch (error) {
    console.error('Get revenue report error:', error);
    sendError(res, error.message || 'Failed to get revenue report', 500);
  }
};
