// Quotation Model/Repository
const { query, queryOne } = require('../utils/database');

class Quotation {
    static async create(quotationData) {
        const sql = `
            INSERT INTO quotations (franchise_id, quotation_number, quotation_date, valid_until,
                customer_id, customer_name, customer_email, quotation_type,
                subtotal, tax_amount, discount_amount, grand_total, status, notes, letter_body, terms, payment_terms, delivery_time, warranty, reference_number, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const result = await query(sql, [
            quotationData.franchiseId,
            quotationData.quotationNumber,
            quotationData.quotationDate,
            quotationData.validUntil || null,
            quotationData.customerId || null,
            quotationData.customerName || null,
            quotationData.customerEmail || null,
            quotationData.quotationType || 'with_rates',
            quotationData.subtotal || 0,
            quotationData.taxAmount || 0,
            quotationData.discountAmount || 0,
            quotationData.grandTotal || 0,
            quotationData.status || 'draft',
            quotationData.notes || null,
            quotationData.letterBody || null,
            quotationData.terms || null,
            quotationData.paymentTerms || null,
            quotationData.deliveryTime || null,
            quotationData.warranty || null,
            quotationData.referenceNumber || null,
            quotationData.createdBy
        ]);

        return { id: result.insertId, ...quotationData };
    }

    static async findById(id) {
        const sql = `
      SELECT * FROM quotations
      WHERE id = ? AND deleted_at IS NULL
    `;
        const quotation = await queryOne(sql, [id]);

        if (quotation) {
            const itemsSql = 'SELECT * FROM quotation_items WHERE quotation_id = ?';
            quotation.items = await query(itemsSql, [id]);
        }

        return quotation;
    }

    static async findByNumber(franchiseId, quotationNumber) {
        const sql = `
      SELECT * FROM quotations
      WHERE franchise_id = ? AND quotation_number = ? AND deleted_at IS NULL
    `;
        return await queryOne(sql, [franchiseId, quotationNumber]);
    }

    static async getAll(franchiseId, limit = 50, offset = 0) {
        const sql = `
      SELECT * FROM quotations
      WHERE franchise_id = ? AND deleted_at IS NULL
      ORDER BY quotation_date DESC
      LIMIT ? OFFSET ?
    `;
        return await query(sql, [franchiseId, limit, offset]);
    }

    static async update(id, updatedData) {
        const allowedFields = [
            'quotationNumber', 'quotationDate', 'validUntil', 'customerId',
            'customerName', 'customerEmail', 'quotationType', 'subtotal',
            'taxAmount', 'discountAmount', 'grandTotal', 'status', 'notes',
            'letterBody', 'terms', 'paymentTerms', 'deliveryTime', 'warranty', 'referenceNumber'
        ];

        const updates = [];
        const values = [];

        for (const field of allowedFields) {
            if (field in updatedData) {
                const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
                updates.push(`${dbField} = ?`);
                values.push(updatedData[field]);
            }
        }

        if (updates.length === 0) return null;

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        const sql = `UPDATE quotations SET ${updates.join(', ')} WHERE id = ?`;
        await query(sql, values);

        return await this.findById(id);
    }

    static async updateStatus(id, status) {
        const sql = `UPDATE quotations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        await query(sql, [status, id]);
        return await this.findById(id);
    }

    static async delete(id) {
        const sql = `UPDATE quotations SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`;
        return await query(sql, [id]);
    }

    static async addItem(quotationId, itemData) {
        const sql = `
      INSERT INTO quotation_items (quotation_id, product_id, product_name, description,
                quantity, unit_price, tax_rate, line_total, hsn_code)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const result = await query(sql, [
            quotationId,
            itemData.productId || null,
            itemData.productName,
            itemData.description || null,
            itemData.quantity,
            itemData.unitPrice,
            itemData.taxRate || 0,
            itemData.lineTotal,
            itemData.hsnCode || itemData.hsn_code || null
        ]);

        return { id: result.insertId, ...itemData };
    }

    static async getItems(quotationId) {
        const sql = 'SELECT * FROM quotation_items WHERE quotation_id = ?';
        return await query(sql, [quotationId]);
    }

    static async updateItem(itemId, itemData) {
        const allowedFields = ['productId', 'productName', 'description', 'quantity', 'unitPrice', 'taxRate', 'lineTotal', 'hsnCode'];
        const updates = [];
        const values = [];

        for (const field of allowedFields) {
            if (field in itemData) {
                const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
                updates.push(`${dbField} = ?`);
                values.push(itemData[field]);
            }
        }

        if (updates.length === 0) return null;

        values.push(itemId);
        const sql = `UPDATE quotation_items SET ${updates.join(', ')} WHERE id = ?`;
        await query(sql, values);

        return await this.getItemById(itemId);
    }

    static async getItemById(itemId) {
        const sql = 'SELECT * FROM quotation_items WHERE id = ?';
        return await queryOne(sql, [itemId]);
    }

    static async deleteItem(itemId) {
        const sql = 'DELETE FROM quotation_items WHERE id = ?';
        return await query(sql, [itemId]);
    }

    static async deleteAllItems(quotationId) {
        const sql = 'DELETE FROM quotation_items WHERE quotation_id = ?';
        return await query(sql, [quotationId]);
    }

    static async getCountByDate(franchiseId, startDate, endDate) {
        const sql = `
      SELECT COUNT(*) as count FROM quotations
      WHERE franchise_id = ? AND quotation_date BETWEEN ? AND ? AND deleted_at IS NULL
    `;
        const result = await queryOne(sql, [franchiseId, startDate, endDate]);
        return result.count;
    }

    static async getTotalByDateAndStatus(franchiseId, startDate, endDate, status) {
        const sql = `
      SELECT SUM(grand_total) as total FROM quotations
      WHERE franchise_id = ? AND quotation_date BETWEEN ? AND ? AND status = ? AND deleted_at IS NULL
    `;
        const result = await queryOne(sql, [franchiseId, startDate, endDate, status]);
        return result.total || 0;
    }

    static async convertToInvoice(quotationId, invoiceNumber, invoiceDate) {
        try {
            // Get quotation details
            const quotation = await this.findById(quotationId);
            if (!quotation) {
                throw new Error('Quotation not found');
            }

            // Create invoice from quotation
            const Invoice = require('./Invoice');
            const invoiceData = {
                franchiseId: quotation.franchise_id,
                invoiceNumber,
                invoiceDate,
                dueDate: null,
                customerName: quotation.customer_name,
                customerEmail: quotation.customer_email,
                subtotal: quotation.subtotal,
                taxAmount: quotation.tax_amount,
                discountAmount: quotation.discount_amount,
                totalAmount: quotation.grand_total,
                paymentStatus: 'pending',
                notes: `Converted from quotation ${quotation.quotation_number}`
            };

            const newInvoice = await Invoice.create(invoiceData);

            // Copy items to invoice
            for (const item of quotation.items) {
                await Invoice.addItem(newInvoice.id, {
                    productId: item.product_id,
                    productName: item.product_name,
                    quantity: item.quantity,
                    unitPrice: item.unit_price,
                    taxRate: item.tax_rate,
                    lineTotal: item.line_total
                });
            }

            // Update quotation status
            await this.updateStatus(quotationId, 'accepted');

            return newInvoice;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Quotation;
