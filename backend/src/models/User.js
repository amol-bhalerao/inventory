// User Model/Repository
const { query, queryOne } = require('../utils/database');
const { hashPassword } = require('../utils/helpers');

class User {
  static async create(userData) {
    const hashedPassword = await hashPassword(userData.password);

    const sql = `
      INSERT INTO users (franchise_id, role_id, username, email, password_hash, first_name, last_name, phone, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await query(sql, [
      userData.franchiseId,
      userData.roleId,
      userData.username,
      userData.email,
      hashedPassword,
      userData.firstName || null,
      userData.lastName || null,
      userData.phone || null,
      userData.isActive !== false ? 1 : 0
    ]);

    return { id: result.insertId, ...userData };
  }

  static async findById(id) {
    const sql = `
      SELECT u.*, r.name as role, f.name as franchise
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN franchises f ON u.franchise_id = f.id
      WHERE u.id = ? AND u.deleted_at IS NULL
    `;
    return await queryOne(sql, [id]);
  }

  static async findByEmail(email) {
    const sql = `
      SELECT u.*, r.name as role
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = ? AND u.deleted_at IS NULL
    `;
    return await queryOne(sql, [email]);
  }

  static async findByUsername(username) {
    const sql = `
      SELECT u.*, r.name as role
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.username = ? AND u.deleted_at IS NULL
    `;
    return await queryOne(sql, [username]);
  }

  static async update(id, userData) {
    let sql = 'UPDATE users SET ';
    const updateFields = [];
    const values = [];

    // Handle password separately with hashing
    let passwordPromise = null;

    Object.entries(userData).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (key === 'password') {
          // Don't add to updateFields yet, hash it asynchronously
          return;
        }
        // Convert camelCase to snake_case
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        updateFields.push(`${dbField} = ?`);
        values.push(value);
      }
    });

    // Hash password if provided
    if (userData.password && userData.password.trim()) {
      const hashedPassword = await hashPassword(userData.password);
      updateFields.push('password_hash = ?');
      values.push(hashedPassword);
    }

    if (updateFields.length === 0) {
      return await this.findById(id);
    }

    sql += updateFields.join(', ') + ' WHERE id = ?';
    values.push(id);

    await query(sql, values);
    return await this.findById(id);
  }

  static async delete(id) {
    const sql = 'UPDATE users SET deleted_at = NOW() WHERE id = ?';
    await query(sql, [id]);
  }

  static async findByFranchise(franchiseId) {
    const sql = `
      SELECT u.*, r.name as role, f.name as franchise
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN franchises f ON u.franchise_id = f.id
      WHERE u.franchise_id = ? AND u.deleted_at IS NULL
    `;
    return await query(sql, [franchiseId]);
  }

  static async getAll() {
    const sql = `
      SELECT u.*, r.name as role, f.name as franchise
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN franchises f ON u.franchise_id = f.id
      WHERE u.deleted_at IS NULL
      ORDER BY u.created_at DESC
    `;
    return await query(sql, []);
  }

  static async getRoleIdByName(roleName) {
    const sql = `SELECT id FROM roles WHERE name = ? LIMIT 1`;
    const result = await queryOne(sql, [roleName]);
    return result ? result.id : null;
  }
}

module.exports = User;
