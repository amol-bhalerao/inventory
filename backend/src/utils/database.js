// Database Query Helpers
const pool = require('../config/database-pool');

const query = async (sql, values = []) => {
  try {
    const connection = await pool.getConnection();
    const [results] = await connection.execute(sql, values);
    connection.release();
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

const queryOne = async (sql, values = []) => {
  const results = await query(sql, values);
  return results.length > 0 ? results[0] : null;
};

const transaction = async (callback) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  query,
  queryOne,
  transaction
};
