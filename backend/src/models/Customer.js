// Customer Model/Repository
const { query, queryOne } = require('../utils/database');

class Customer {
    static async create(customerData) {
        const sql = `
      INSERT INTO customers (franchise_id, name, email, phone, gst_number, address, city, state, country, postal_code, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const result = await query(sql, [
            customerData.franchiseId,
            customerData.name,
            customerData.email || null,
            customerData.phone || null,
            customerData.gst_number || null,
            customerData.address || null,
            customerData.city || null,
            customerData.state || null,
            customerData.country || null,
            customerData.postal_code || null,
            customerData.is_active !== false ? 1 : 0
        ]);

        return { id: result.insertId, ...customerData };
    }

    static async findById(id) {
        const sql = `
      SELECT * FROM customers
      WHERE id = ? AND deleted_at IS NULL
    `;
        return await queryOne(sql, [id]);
    }

    static async findByGSTNumber(franchiseId, gstNumber) {
        const sql = `
      SELECT * FROM customers
      WHERE franchise_id = ? AND gst_number = ? AND deleted_at IS NULL
    `;
        return await queryOne(sql, [franchiseId, gstNumber]);
    }

    static async findByFranchise(franchiseId, limit = 100, offset = 0) {
        const sql = `
      SELECT * FROM customers
      WHERE franchise_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
        return await query(sql, [franchiseId, limit, offset]);
    }

    static async update(id, customerData) {
        let updateFields = [];
        let values = [];

        Object.entries(customerData).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                updateFields.push(`${dbField} = ?`);
                values.push(value);
            }
        });

        if (updateFields.length === 0) {
            return await this.findById(id);
        }

        let sql = 'UPDATE customers SET ' + updateFields.join(', ') + ' WHERE id = ?';
        values.push(id);

        await query(sql, values);
        return await this.findById(id);
    }

    static async delete(id) {
        const sql = 'UPDATE customers SET deleted_at = NOW() WHERE id = ?';
        await query(sql, [id]);
    }
}

module.exports = Customer;
