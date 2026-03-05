// Application Configuration
require('dotenv').config();

module.exports = {
  app: {
    name: process.env.APP_NAME || 'Pavtibook',
    port: process.env.APP_PORT || 5000,
    host: process.env.APP_HOST || 'localhost',
    env: process.env.NODE_ENV || 'development'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your_super_secret_key',
    expiresIn: process.env.JWT_EXPIRE || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '30d'
  },
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(o => o.trim()),
    credentials: true
  },
  upload: {
    maxFileSize: process.env.MAX_FILE_SIZE || 5242880, // 5MB
    uploadDir: process.env.UPLOAD_DIR || './uploads'
  },
  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD
  }
};
