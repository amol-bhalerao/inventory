const express = require('express');
const router = express.Router();
const pool = require('../config/database-pool');

// simple controller
router.get('/', async (req, res) => {
  try {
    // check database connectivity
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();

    res.json({
      success: true,
      message: 'API server is healthy',
      database: 'reachable',
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'API server is unhealthy',
      database: 'unreachable',
      error: err.message
    });
  }
});

module.exports = router;
