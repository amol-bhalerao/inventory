// Franchise Model/Repository
const { query, queryOne } = require('../utils/database');

class Franchise {
  static async create(franchiseData) {
    // Support both snake_case and camelCase for postal_code
    const postalCode = franchiseData.postalCode || franchiseData.postal_code || null;

    const sql = `
      INSERT INTO franchises (name, app_name, email, phone, address, city, state, country, postal_code, status, subscription_plan)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await query(sql, [
      franchiseData.name,
      franchiseData.appName || 'Pavtibook',
      franchiseData.email,
      franchiseData.phone || null,
      franchiseData.address || null,
      franchiseData.city || null,
      franchiseData.state || null,
      franchiseData.country || null,
      postalCode,
      franchiseData.status || 'active',
      franchiseData.subscriptionPlan || 'basic'
    ]);

    // Return the created franchise from database (not just what was passed in)
    return await this.findById(result.insertId);
  }

  static async findById(id) {
    const sql = `
      SELECT * FROM franchises
      WHERE id = ? AND deleted_at IS NULL
    `;
    return await queryOne(sql, [id]);
  }

  static async findAll(limit = 100, offset = 0) {
    const sql = `
      SELECT * FROM franchises
      WHERE deleted_at IS NULL
      LIMIT ? OFFSET ?
    `;
    return await query(sql, [limit, offset]);
  }

  static async update(id, franchiseData) {
    let updateFields = [];
    let values = [];

    const fieldMap = {
      name: 'name',
      appName: 'app_name',
      phone: 'phone',
      address: 'address',
      city: 'city',
      state: 'state',
      country: 'country',
      postalCode: 'postal_code',
      postal_code: 'postal_code',
      status: 'status',
      subscriptionPlan: 'subscription_plan',
      logoUrl: 'logo_url',
      email: 'email'
    };

    Object.entries(franchiseData).forEach(([key, value]) => {
      if (fieldMap[key] && value !== undefined && value !== null && value !== '') {
        updateFields.push(`${fieldMap[key]} = ?`);
        values.push(value);
      }
    });

    if (updateFields.length === 0) {
      return await this.findById(id);
    }

    values.push(id);
    const sql = `UPDATE franchises SET ${updateFields.join(', ')} WHERE id = ?`;
    await query(sql, values);

    return await this.findById(id);
  }

  static async delete(id) {
    const sql = 'UPDATE franchises SET deleted_at = NOW() WHERE id = ?';
    await query(sql, [id]);
  }

  static async countUsers(franchiseId) {
    const sql = 'SELECT COUNT(*) as count FROM users WHERE franchise_id = ? AND deleted_at IS NULL';
    const result = await queryOne(sql, [franchiseId]);
    return result.count;
  }
}

module.exports = Franchise;
