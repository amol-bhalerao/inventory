// Product Model/Repository
const { query, queryOne } = require('../utils/database');

class Product {
  static async create(productData) {
    const sql = `
      INSERT INTO products (franchise_id, sku, name, description, category, unit_of_measure, 
        purchase_price, selling_price, quantity_on_hand, reorder_level, gst_percentage, hsn_code, supplier_id, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await query(sql, [
      productData.franchiseId,
      productData.sku,
      productData.name,
      productData.description || null,
      productData.category || null,
      productData.unitOfMeasure || 'UNT',
      productData.purchasePrice || 0,
      productData.sellingPrice || 0,
      productData.quantityOnHand || 0,
      productData.reorderLevel || 0,
      productData.gstPercentage || productData.gst_percentage || 0,
      productData.hsnCode || productData.hsn_code || null,
      productData.supplierId || null,
      productData.isActive !== false ? 1 : 0
    ]);

    return { id: result.insertId, ...productData };
  }

  static async findById(id) {
    const sql = `
      SELECT p.*, s.name as supplier_name
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ? AND p.deleted_at IS NULL
    `;
    return await queryOne(sql, [id]);
  }

  static async findByFranchise(franchiseId, limit = 100, offset = 0) {
    const sql = `
      SELECT p.*, s.name as supplier_name
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.franchise_id = ? AND p.deleted_at IS NULL
      LIMIT ? OFFSET ?
    `;
    return await query(sql, [franchiseId, limit, offset]);
  }

  static async findBySKU(franchiseId, sku) {
    const sql = `
      SELECT * FROM products
      WHERE franchise_id = ? AND sku = ? AND deleted_at IS NULL
    `;
    return await queryOne(sql, [franchiseId, sku]);
  }

  static async update(id, productData) {
    let updateFields = [];
    let values = [];

    const fieldMap = {
      sku: 'sku',
      name: 'name',
      description: 'description',
      category: 'category',
      unitOfMeasure: 'unit_of_measure',
      unit_of_measure: 'unit_of_measure',
      purchasePrice: 'purchase_price',
      purchase_price: 'purchase_price',
      sellingPrice: 'selling_price',
      selling_price: 'selling_price',
      quantityOnHand: 'quantity_on_hand',
      quantity_on_hand: 'quantity_on_hand',
      reorderLevel: 'reorder_level',
      reorder_level: 'reorder_level',
      gstPercentage: 'gst_percentage',
      gst_percentage: 'gst_percentage',
      hsnCode: 'hsn_code',
      hsn_code: 'hsn_code',
      supplierId: 'supplier_id',
      supplier_id: 'supplier_id',
      isActive: 'is_active',
      is_active: 'is_active',
      unit_price: 'purchase_price'
    };

    const numericFields = ['purchase_price', 'selling_price', 'quantity_on_hand', 'reorder_level', 'gst_percentage'];
    const nullableFields = ['supplier_id', 'description', 'category', 'hsn_code'];

    Object.entries(productData).forEach(([key, value]) => {
      if (fieldMap[key]) {
        const dbColumn = fieldMap[key];
        let finalValue = value;

        // Convert empty strings to NULL for nullable fields
        if (nullableFields.includes(dbColumn)) {
          if (value === '' || value === null || value === undefined) {
            finalValue = null;
          } else {
            finalValue = String(value).trim();
            if (finalValue === '') finalValue = null;
          }
        }
        // Convert to number for numeric fields
        else if (numericFields.includes(dbColumn)) {
          if (value === null || value === undefined || value === '') {
            finalValue = 0;
          } else {
            const numValue = parseFloat(value);
            finalValue = isNaN(numValue) ? 0 : numValue;
          }
        }

        // Only add if value is defined
        if (finalValue !== undefined) {
          updateFields.push(`${dbColumn} = ?`);
          values.push(finalValue);
        }
      }
    });

    if (updateFields.length === 0) {
      return await this.findById(id);
    }

    values.push(id);
    const sql = `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`;
    await query(sql, values);

    return await this.findById(id);
  }

  static async delete(id) {
    const sql = 'UPDATE products SET deleted_at = NOW() WHERE id = ?';
    await query(sql, [id]);
  }

  static async getLowStockProducts(franchiseId) {
    const sql = `
      SELECT * FROM products
      WHERE franchise_id = ? AND quantity_on_hand <= reorder_level AND deleted_at IS NULL
    `;
    return await query(sql, [franchiseId]);
  }

  static async updateStock(productId, quantityChange) {
    const sql = 'UPDATE products SET quantity_on_hand = quantity_on_hand + ? WHERE id = ?';
    await query(sql, [quantityChange, productId]);
  }
}

module.exports = Product;
