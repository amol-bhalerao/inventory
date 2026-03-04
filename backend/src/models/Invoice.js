// Invoice Model/Repository
const { query, queryOne } = require('../utils/database');

class Invoice {
  static async create(invoiceData) {
    const sql = `
      INSERT INTO invoices (franchise_id, invoice_number, invoice_date, due_date, 
        customer_name, customer_email, customer_phone, customer_address,
        customer_city, customer_state, customer_postal_code, customer_gst,
        subtotal, tax_amount, discount_amount, total_amount, payment_status, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await query(sql, [
      invoiceData.franchiseId,
      invoiceData.invoiceNumber,
      invoiceData.invoiceDate,
      invoiceData.dueDate || null,
      invoiceData.customerName || null,
      invoiceData.customerEmail || null,
      invoiceData.customerPhone || null,
      invoiceData.customerAddress || null,
      invoiceData.customerCity || null,
      invoiceData.customerState || null,
      invoiceData.customerPostalCode || null,
      invoiceData.customerGst || null,
      invoiceData.subtotal || 0,
      invoiceData.taxAmount || 0,
      invoiceData.discountAmount || 0,
      invoiceData.totalAmount || 0,
      invoiceData.paymentStatus || 'unpaid',
      invoiceData.notes || null,
      invoiceData.createdBy
    ]);

    return { id: result.insertId, ...invoiceData };
  }

  static async findById(id) {
    const sql = `
      SELECT * FROM invoices
      WHERE id = ? AND deleted_at IS NULL
    `;
    const invoice = await queryOne(sql, [id]);

    if (invoice) {
      const itemsSql = `
        SELECT 
          ii.*, 
          p.description, 
          p.hsn_code, 
          p.gst_percentage
        FROM invoice_items ii
        LEFT JOIN products p ON ii.product_id = p.id
        WHERE ii.invoice_id = ?
      `;
      invoice.items = await query(itemsSql, [id]);
    }

    return invoice;
  }

  static async findByNumber(franchiseId, invoiceNumber) {
    const sql = `
      SELECT * FROM invoices
      WHERE franchise_id = ? AND invoice_number = ? AND deleted_at IS NULL
    `;
    return await queryOne(sql, [franchiseId, invoiceNumber]);
  }

  static async findByFranchise(franchiseId, limit = 100, offset = 0, filters = {}) {
    let sql = `
      SELECT * FROM invoices
      WHERE franchise_id = ? AND deleted_at IS NULL
    `;
    let params = [franchiseId];

    if (filters.paymentStatus) {
      sql += ' AND payment_status = ?';
      params.push(filters.paymentStatus);
    }

    if (filters.startDate) {
      sql += ' AND invoice_date >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      sql += ' AND invoice_date <= ?';
      params.push(filters.endDate);
    }

    sql += ' ORDER BY invoice_date DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return await query(sql, params);
  }

  static async update(id, invoiceData) {
    let updateFields = [];
    let values = [];

    const fieldMap = {
      invoiceNumber: 'invoice_number',
      invoiceDate: 'invoice_date',
      dueDate: 'due_date',
      customerName: 'customer_name',
      customerEmail: 'customer_email',
      customerPhone: 'customer_phone',
      customerAddress: 'customer_address',
      customerCity: 'customer_city',
      customerState: 'customer_state',
      customerPostalCode: 'customer_postal_code',
      customerGst: 'customer_gst',
      subtotal: 'subtotal',
      taxAmount: 'tax_amount',
      discountAmount: 'discount_amount',
      totalAmount: 'total_amount',
      paymentStatus: 'payment_status',
      notes: 'notes'
    };

    Object.entries(invoiceData).forEach(([key, value]) => {
      if (fieldMap[key] && value !== undefined) {
        updateFields.push(`${fieldMap[key]} = ?`);
        values.push(value);
      }
    });

    if (updateFields.length === 0) {
      return await this.findById(id);
    }

    values.push(id);
    const sql = `UPDATE invoices SET ${updateFields.join(', ')} WHERE id = ?`;
    await query(sql, values);

    return await this.findById(id);
  }

  static async delete(id) {
    const sql = 'UPDATE invoices SET deleted_at = NOW() WHERE id = ?';
    await query(sql, [id]);
  }

  static async getRevenue(franchiseId, startDate, endDate) {
    const sql = `
      SELECT SUM(total_amount) as total_revenue, COUNT(*) as total_invoices
      FROM invoices
      WHERE franchise_id = ? AND invoice_date >= ? AND invoice_date <= ? AND deleted_at IS NULL
    `;
    return await queryOne(sql, [franchiseId, startDate, endDate]);
  }
}

module.exports = Invoice;
