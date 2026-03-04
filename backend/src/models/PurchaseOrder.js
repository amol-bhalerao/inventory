// Purchase Order Model/Repository
const { query, queryOne } = require('../utils/database');

class PurchaseOrder {
  static async create(poData) {
    const sql = `
      INSERT INTO purchase_orders (franchise_id, po_number, supplier_id, po_date, delivery_date,
        subtotal, tax_amount, total_amount, status, notes, bill_image_url, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await query(sql, [
      poData.franchiseId,
      poData.poNumber,
      poData.supplierId,
      poData.poDate,
      poData.deliveryDate || null,
      poData.subtotal || 0,
      poData.taxAmount || 0,
      poData.totalAmount || 0,
      poData.status || 'draft',
      poData.notes || null,
      poData.billImageUrl || null,
      poData.createdBy
    ]);

    return { id: result.insertId, ...poData };
  }

  static async findById(id) {
    const sql = `
      SELECT po.*, s.name as supplier_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.id = ? AND po.deleted_at IS NULL
    `;
    const po = await queryOne(sql, [id]);
    
    if (po) {
      const itemsSql = 'SELECT * FROM purchase_order_items WHERE purchase_order_id = ?';
      po.items = await query(itemsSql, [id]);
    }

    return po;
  }

  static async findByFranchise(franchiseId, limit = 100, offset = 0, filters = {}) {
    let sql = `
      SELECT po.*, s.name as supplier_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.franchise_id = ? AND po.deleted_at IS NULL
    `;
    let params = [franchiseId];

    if (filters.status) {
      sql += ' AND po.status = ?';
      params.push(filters.status);
    }

    if (filters.supplierId) {
      sql += ' AND po.supplier_id = ?';
      params.push(filters.supplierId);
    }

    sql += ' ORDER BY po.po_date DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return await query(sql, params);
  }

  static async update(id, poData) {
    let updateFields = [];
    let values = [];

    const fieldMap = {
      poNumber: 'po_number',
      supplierId: 'supplier_id',
      poDate: 'po_date',
      deliveryDate: 'delivery_date',
      subtotal: 'subtotal',
      taxAmount: 'tax_amount',
      totalAmount: 'total_amount',
      status: 'status',
      notes: 'notes',
      billImageUrl: 'bill_image_url'
    };

    Object.entries(poData).forEach(([key, value]) => {
      if (fieldMap[key] && value !== undefined) {
        updateFields.push(`${fieldMap[key]} = ?`);
        values.push(value);
      }
    });

    if (updateFields.length === 0) {
      return await this.findById(id);
    }

    values.push(id);
    const sql = `UPDATE purchase_orders SET ${updateFields.join(', ')} WHERE id = ?`;
    await query(sql, values);

    return await this.findById(id);
  }

  static async delete(id) {
    const sql = 'UPDATE purchase_orders SET deleted_at = NOW() WHERE id = ?';
    await query(sql, [id]);
  }

  static async updateStatus(id, status) {
    const sql = 'UPDATE purchase_orders SET status = ? WHERE id = ?';
    await query(sql, [status, id]);
  }
}

module.exports = PurchaseOrder;
