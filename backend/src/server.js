// Main Server Application
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');

// Import config
const appConfig = require('./config/app');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const auditLog = require('./middleware/auditLog');

// Import routes
const authRoutes = require('./routes/authRoutes');
const franchiseRoutes = require('./routes/franchiseRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const quotationRoutes = require('./routes/quotationRoutes');
const poRoutes = require('./routes/poRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const customerRoutes = require('./routes/customerRoutes');
const purchaseBillRoutes = require('./routes/purchaseBillRoutes');
const stockRoutes = require('./routes/stockRoutes');
const ledgerRoutes = require('./routes/ledgerRoutes');

// Initialize Express app
const app = express();

// Create uploads directory if it doesn't exist
const uploadsDir = appConfig.upload.uploadDir;
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors(appConfig.cors));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Audit logging middleware
app.use(auditLog);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/franchises', franchiseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/purchase-orders', poRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/purchase-bills', purchaseBillRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/ledger', ledgerRoutes);

// Serve static files (uploads)
app.use('/uploads', express.static(uploadsDir));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = appConfig.app.port || 5000;
const HOST = appConfig.app.host || 'localhost';

app.listen(PORT, HOST, () => {
  console.log(`
╔════════════════════════════════════════╗
║     ${appConfig.app.name} Backend Server        ║
╚════════════════════════════════════════╝

Environment: ${appConfig.app.env}
Server: http://${HOST}:${PORT}
API Docs: http://${HOST}:${PORT}/api

Server is running successfully!
  `);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nServer shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nServer shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
