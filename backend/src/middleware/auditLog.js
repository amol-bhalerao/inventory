// Audit Logging Middleware
const pool = require('../config/database-pool');

const auditLog = async (req, res, next) => {
  // Store original send
  const originalSend = res.send;

  // Override send
  res.send = function (data) {
    // Log if it was a data-modifying request
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && res.statusCode >= 200 && res.statusCode < 400) {
      logAudit(req, res, data).catch(err => console.error('Audit log error:', err));
    }

    res.send = originalSend;
    return res.send(data);
  };

  next();
};

const logAudit = async (req, res, data) => {
  try {
    // Skip audit logging if user is not authenticated
    if (!req.user || !req.user.id || !req.user.franchiseId) {
      return;
    }

    const connection = await pool.getConnection();

    const parts = req.baseUrl.split('/');
    const auditData = {
      franchise_id: req.user.franchiseId || null,
      user_id: req.user.id || null,
      action: req.method || null,
      module: parts[2] || null,
      entity_type: parts[3] || null,
      entity_id: req.params.id || null,
      old_values: null,
      new_values: JSON.stringify(req.body) || null,
      ip_address: req.ip || null,
      user_agent: req.headers['user-agent'] || null
    };

    const query = `
      INSERT INTO audit_logs (franchise_id, user_id, action, module, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await connection.execute(query, [
      auditData.franchise_id,
      auditData.user_id,
      auditData.action,
      auditData.module,
      auditData.entity_type,
      auditData.entity_id,
      auditData.old_values,
      auditData.new_values,
      auditData.ip_address,
      auditData.user_agent
    ]);

    connection.release();
  } catch (error) {
    console.error('Error logging audit:', error);
  }
};

module.exports = auditLog;
