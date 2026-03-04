// MySQL Connection Pool
const mysql = require('mysql2/promise');
const config = require('./database');

const pool = mysql.createPool({
  host: config.host,
  port: config.port,
  user: config.username,
  password: config.password,
  database: config.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true
});

// Test the connection
pool.getConnection()
  .then(connection => {
    console.log('MySQL connection pool created successfully');
    connection.release();
  })
  .catch(err => {
    console.error('Error creating MySQL connection pool:', err);
  });

module.exports = pool;
