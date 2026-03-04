// Quotation Controller
const Quotation = require('../models/Quotation');
const { query } = require('../utils/database');
const { sendSuccess, sendError } = require('../utils/response');
const { generateQuotationNumber } = require('../utils/helpers');

// Create quotation
exports.create = async (req, res) => {
    try {
        const { customerName, customerEmail, customerId, quotationType, quotationDate, validUntil, items, notes, grandTotal, paymentTerms, deliveryTime, warranty, letterBody, terms } = req.body;

        if (!items || items.length === 0) {
            return sendError(res, 'Quotation must have at least one item', 400);
        }

        // Calculate totals
        let subtotal = 0;
        let totalTax = 0;
        let total = 0;

        if (items && items.length > 0) {
            items.forEach(item => {
                const lineSubtotal = item.quantity * item.unitPrice;
                const lineTax = lineSubtotal * (item.taxRate / 100);
                subtotal += lineSubtotal;
                totalTax += lineTax;
                total += lineSubtotal + lineTax;
            });
        } else if (quotationType === 'without_rates' && grandTotal) {
            // For summary mode, use the grand_total provided
            total = parseFloat(grandTotal);
        }

        // Generate quotation number
        const quotationNumber = await generateQuotationNumber(req.user.franchiseId);

        const quotation = await Quotation.create({
            franchiseId: req.user.franchiseId,
            quotationNumber,
            quotationDate,
            validUntil,
            customerId,
            customerName,
            customerEmail,
            quotationType,
            subtotal,
            taxAmount: totalTax,
            grandTotal: total,
            notes,
            letterBody: letterBody || null,
            terms: terms || null,
            paymentTerms: paymentTerms || null,
            deliveryTime: deliveryTime || null,
            warranty: warranty || null,
            createdBy: req.user.id,
            status: 'draft'
        });

        // Add quotation items
        if (items && items.length > 0) {
            for (const item of items) {
                const lineTotal = (item.quantity * item.unitPrice) * (1 + (item.taxRate / 100));
                await Quotation.addItem(quotation.id, {
                    productId: item.productId || null,
                    productName: item.productName,
                    description: item.description || null,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    taxRate: item.taxRate || 0,
                    lineTotal,
                    hsnCode: item.hsnCode || item.hsn_code || null
                });
            }
        }

        const createdQuotation = await Quotation.findById(quotation.id);
        sendSuccess(res, createdQuotation, 'Quotation created successfully');
    } catch (error) {
        sendError(res, error.message, 500);
    }
};

// Get all quotations
exports.getAll = async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const quotations = await Quotation.getAll(req.user.franchiseId, parseInt(limit), parseInt(offset));

        // Fetch items for each quotation
        for (let quotation of quotations) {
            quotation.items = await Quotation.getItems(quotation.id);
        }

        sendSuccess(res, 'Quotations retrieved successfully', { quotations });
    } catch (error) {
        sendError(res, error.message, 500);
    }
};

// Get quotation by ID
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        const quotation = await Quotation.findById(id);

        if (!quotation) {
            return sendError(res, 'Quotation not found', 404);
        }

        sendSuccess(res, 'Quotation retrieved successfully', quotation);
    } catch (error) {
        sendError(res, error.message, 500);
    }
};

// Update quotation
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { customerName, customerEmail, customerId, quotationType, quotationDate, validUntil, items, notes, status, grandTotal, letterBody, terms, paymentTerms, deliveryTime, warranty, referenceNumber } = req.body;

        const quotation = await Quotation.findById(id);
        if (!quotation) {
            return sendError(res, 'Quotation not found', 404);
        }

        // Calculate totals
        let subtotal = 0;
        let totalTax = 0;
        let total = 0;

        if (items && items.length > 0) {
            items.forEach(item => {
                const lineSubtotal = item.quantity * item.unitPrice;
                const lineTax = lineSubtotal * (item.taxRate / 100);
                subtotal += lineSubtotal;
                totalTax += lineTax;
                total += lineSubtotal + lineTax;
            });
        } else if (quotationType === 'without_rates' && grandTotal) {
            // For summary mode, use the grand_total provided
            total = parseFloat(grandTotal);
        }

        // Update quotation
        const updated = await Quotation.update(id, {
            customerName,
            customerEmail,
            customerId,
            quotationType,
            quotationDate,
            validUntil,
            subtotal,
            taxAmount: totalTax,
            grandTotal: total || quotation.grand_total,
            notes,
            status: status || quotation.status,
            letterBody,
            terms,
            paymentTerms,
            deliveryTime,
            warranty,
            referenceNumber
        });

        // Update items if provided
        if (items && items.length > 0) {
            // Delete existing items
            await Quotation.deleteAllItems(id);

            // Add new items
            for (const item of items) {
                const lineTotal = (item.quantity * item.unitPrice) * (1 + (item.taxRate / 100));
                await Quotation.addItem(id, {
                    productId: item.productId || null,
                    productName: item.productName,
                    description: item.description || null,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    taxRate: item.taxRate || 0,
                    lineTotal,
                    hsnCode: item.hsnCode || item.hsn_code || null
                });
            }
        }

        const updatedQuotation = await Quotation.findById(id);
        sendSuccess(res, updatedQuotation, 'Quotation updated successfully');
    } catch (error) {
        sendError(res, error.message, 500);
    }
};

// Change quotation status
exports.changeStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['draft', 'sent', 'accepted', 'rejected'].includes(status)) {
            return sendError(res, 'Invalid status', 400);
        }

        const quotation = await Quotation.findById(id);
        if (!quotation) {
            return sendError(res, 'Quotation not found', 404);
        }

        const updated = await Quotation.updateStatus(id, status);
        sendSuccess(res, updated, 'Quotation status updated successfully');
    } catch (error) {
        sendError(res, error.message, 500);
    }
};

// Convert quotation to invoice
exports.convertToInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const { invoiceNumber, invoiceDate } = req.body;

        if (!invoiceNumber || !invoiceDate) {
            return sendError(res, 'Invoice number and date are required', 400);
        }

        const quotation = await Quotation.findById(id);
        if (!quotation) {
            return sendError(res, 'Quotation not found', 404);
        }

        const newInvoice = await Quotation.convertToInvoice(id, invoiceNumber, invoiceDate);
        sendSuccess(res, newInvoice, 'Quotation converted to invoice successfully');
    } catch (error) {
        sendError(res, error.message, 500);
    }
};

// Delete quotation
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        const quotation = await Quotation.findById(id);
        if (!quotation) {
            return sendError(res, 'Quotation not found', 404);
        }

        await Quotation.delete(id);
        sendSuccess(res, { id }, 'Quotation deleted successfully');
    } catch (error) {
        sendError(res, error.message, 500);
    }
};

// Add item to quotation
exports.addItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { productId, productName, description, quantity, unitPrice, taxRate } = req.body;

        const quotation = await Quotation.findById(id);
        if (!quotation) {
            return sendError(res, 'Quotation not found', 404);
        }

        const lineTotal = (quantity * unitPrice) * (1 + (taxRate / 100));
        const item = await Quotation.addItem(id, {
            productId,
            productName,
            description,
            quantity,
            unitPrice,
            taxRate: taxRate || 0,
            lineTotal
        });

        sendSuccess(res, item, 'Item added to quotation');
    } catch (error) {
        sendError(res, error.message, 500);
    }
};

// Update quotation item
exports.updateItem = async (req, res) => {
    try {
        const { id, itemId } = req.params;
        const { productId, productName, description, quantity, unitPrice, taxRate } = req.body;

        const item = await Quotation.getItemById(itemId);
        if (!item) {
            return sendError(res, 'Item not found', 404);
        }

        const lineTotal = (quantity * unitPrice) * (1 + (taxRate / 100));
        const updated = await Quotation.updateItem(itemId, {
            productId,
            productName,
            description,
            quantity,
            unitPrice,
            taxRate: taxRate || 0,
            lineTotal
        });

        sendSuccess(res, updated, 'Item updated successfully');
    } catch (error) {
        sendError(res, error.message, 500);
    }
};

// Delete quotation item
exports.deleteItem = async (req, res) => {
    try {
        const { id, itemId } = req.params;

        const item = await Quotation.getItemById(itemId);
        if (!item) {
            return sendError(res, 'Item not found', 404);
        }

        await Quotation.deleteItem(itemId);
        sendSuccess(res, { itemId }, 'Item deleted successfully');
    } catch (error) {
        sendError(res, error.message, 500);
    }
};
