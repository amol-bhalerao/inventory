// Stock Transactions Model
const { query, queryOne } = require('../utils/database');

class StockTransaction {
  static async create(transactionData) {
    const sql = `
      INSERT INTO stock_transactions (franchise_id, product_id, transaction_type, 
        quantity_change, reference_id, reference_type, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await query(sql, [
      transactionData.franchiseId,
      transactionData.productId,
      transactionData.transactionType, // purchase, sale, adjustment, return
      transactionData.quantityChange,
      transactionData.referenceId || null,
      transactionData.referenceType || null, // invoice, po, manual
      transactionData.notes || null,
      transactionData.createdBy
    ]);

    return { id: result.insertId, ...transactionData };
  }

  static async findById(id) {
    const sql = 'SELECT * FROM stock_transactions WHERE id = ? AND deleted_at IS NULL';
    return await queryOne(sql, [id]);
  }

  static async findByProduct(productId, limit = 100, offset = 0) {
    const sql = `
      SELECT * FROM stock_transactions
      WHERE product_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    return await query(sql, [productId, limit, offset]);
  }

  static async findByFranchise(franchiseId, limit = 100, offset = 0, filters = {}) {
    let sql = `
      SELECT st.*, p.name as product_name, p.sku
      FROM stock_transactions st
      LEFT JOIN products p ON st.product_id = p.id
      WHERE st.franchise_id = ? AND st.deleted_at IS NULL
    `;
    let params = [franchiseId];

    if (filters.transactionType) {
      sql += ' AND st.transaction_type = ?';
      params.push(filters.transactionType);
    }

    if (filters.productId) {
      sql += ' AND st.product_id = ?';
      params.push(filters.productId);
    }

    sql += ' ORDER BY st.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return await query(sql, params);
  }

  static async getProductMovement(productId, startDate, endDate) {
    const sql = `
      SELECT 
        transaction_type,
        SUM(quantity_change) as total_quantity,
        COUNT(*) as transactions
      FROM stock_transactions
      WHERE product_id = ? 
      AND created_at >= ? 
      AND created_at <= ?
      AND deleted_at IS NULL
      GROUP BY transaction_type
    `;
    return await query(sql, [productId, startDate, endDate]);
  }
}

module.exports = StockTransaction;
