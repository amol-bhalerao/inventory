const express = require('express');
const router = express.Router();
const pool = require('../config/database-pool');

// Health check endpoint with database connectivity test
router.get('/', async (req, res) => {
  try {
    // Test database connection
    await pool.ping();

    res.status(200).json({
      status: 'OK',
      message: 'Server and database are running',
      timestamp: new Date(),
      database: 'connected'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      message: 'Database connection failed',
      timestamp: new Date(),
      database: 'disconnected',
      error: error.message
    });
  }
});

module.exports = router;