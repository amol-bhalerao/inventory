// Database Configuration
require('dotenv').config();

const config = {
  development: {
    dialect: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pavtibook_db',
    logging: false // Set to console.log to see SQL queries
  },
  production: {
    dialect: 'mysql',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    logging: false,
    pool: {
      max: 10,
      min: 2,
      idle: 10000
    }
  }
};

module.exports = config[process.env.NODE_ENV || 'development'];
