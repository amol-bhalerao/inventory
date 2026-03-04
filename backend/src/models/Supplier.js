// Supplier Model/Repository
const { query, queryOne } = require('../utils/database');

class Supplier {
  static async create(supplierData) {
    const sql = `
      INSERT INTO suppliers (franchise_id, name, contact_person, email, phone, address, 
        city, state, country, postal_code, payment_terms, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await query(sql, [
      supplierData.franchiseId,
      supplierData.name,
      supplierData.contactPerson || null,
      supplierData.email || null,
      supplierData.phone || null,
      supplierData.address || null,
      supplierData.city || null,
      supplierData.state || null,
      supplierData.country || null,
      supplierData.postalCode || null,
      supplierData.paymentTerms || null,
      supplierData.isActive !== false ? 1 : 0
    ]);

    return { id: result.insertId, ...supplierData };
  }

  static async findById(id) {
    const sql = 'SELECT * FROM suppliers WHERE id = ? AND deleted_at IS NULL';
    return await queryOne(sql, [id]);
  }

  static async findByFranchise(franchiseId, limit = 100, offset = 0) {
    const sql = `
      SELECT * FROM suppliers
      WHERE franchise_id = ? AND deleted_at IS NULL
      LIMIT ? OFFSET ?
    `;
    return await query(sql, [franchiseId, limit, offset]);
  }

  static async update(id, supplierData) {
    let updateFields = [];
    let values = [];

    const fieldMap = {
      name: 'name',
      contactPerson: 'contact_person',
      email: 'email',
      phone: 'phone',
      address: 'address',
      city: 'city',
      state: 'state',
      country: 'country',
      postalCode: 'postal_code',
      paymentTerms: 'payment_terms',
      isActive: 'is_active'
    };

    Object.entries(supplierData).forEach(([key, value]) => {
      if (fieldMap[key] && value !== undefined) {
        updateFields.push(`${fieldMap[key]} = ?`);
        values.push(value);
      }
    });

    if (updateFields.length === 0) {
      return await this.findById(id);
    }

    values.push(id);
    const sql = `UPDATE suppliers SET ${updateFields.join(', ')} WHERE id = ?`;
    await query(sql, values);

    return await this.findById(id);
  }

  static async delete(id) {
    const sql = 'UPDATE suppliers SET deleted_at = NOW() WHERE id = ?';
    await query(sql, [id]);
  }

  static async search(franchiseId, term) {
    const sql = `
      SELECT * FROM suppliers
      WHERE franchise_id = ? AND deleted_at IS NULL
      AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)
      LIMIT 10
    `;
    const searchTerm = `%${term}%`;
    return await query(sql, [franchiseId, searchTerm, searchTerm, searchTerm]);
  }
}

module.exports = Supplier;
