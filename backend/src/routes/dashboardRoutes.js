// Dashboard Routes
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../utils/database');
const { sendSuccess, sendError } = require('../utils/response');

// Get dashboard data for Super Admin
router.get('/admin', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Super Admin') {
      return sendError(res, 'Access denied', 403);
    }

    // Get franchise count
    const franchisesSql = 'SELECT COUNT(*) as count FROM franchises WHERE deleted_at IS NULL';
    const franchisesResult = await query(franchisesSql);

    // Get user count
    const usersSql = 'SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL';
    const usersResult = await query(usersSql);

    // Get total revenue
    const revenueSql = 'SELECT SUM(total_amount) as total_revenue FROM invoices WHERE deleted_at IS NULL';
    const revenueResult = await query(revenueSql);

    // Get recent franchises
    const recentFranchisesSql = 'SELECT * FROM franchises WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 5';
    const recentFranchises = await query(recentFranchisesSql);

    sendSuccess(res, 'Dashboard data retrieved', {
      franchises: franchisesResult[0].count || 0,
      users: usersResult[0].count || 0,
      totalRevenue: revenueResult[0].total_revenue || 0,
      recentFranchises
    });
  } catch (error) {
    console.error('Get admin dashboard error:', error);
    sendError(res, error.message || 'Failed to get dashboard data', 500);
  }
});

// Get dashboard data for Franchise Owner
router.get('/franchise', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Franchise Owner') {
      return sendError(res, 'Access denied', 403);
    }

    const franchiseId = req.user.franchiseId;

    // Get invoice count
    const invoicesSql = 'SELECT COUNT(*) as count FROM invoices WHERE franchise_id = ? AND deleted_at IS NULL';
    const invoicesResult = await query(invoicesSql, [franchiseId]);

    // Get product count
    const productsSql = 'SELECT COUNT(*) as count FROM products WHERE franchise_id = ? AND deleted_at IS NULL';
    const productsResult = await query(productsSql, [franchiseId]);

    // Get total revenue
    const revenueSql = 'SELECT SUM(total_amount) as total_revenue FROM invoices WHERE franchise_id = ? AND deleted_at IS NULL';
    const revenueResult = await query(revenueSql, [franchiseId]);

    // Get low stock products
    const lowStockSql = 'SELECT COUNT(*) as count FROM products WHERE franchise_id = ? AND quantity_on_hand <= reorder_level AND deleted_at IS NULL';
    const lowStockResult = await query(lowStockSql, [franchiseId]);

    // Get recent invoices
    const recentInvoicesSql = 'SELECT * FROM invoices WHERE franchise_id = ? AND deleted_at IS NULL ORDER BY invoice_date DESC LIMIT 5';
    const recentInvoices = await query(recentInvoicesSql, [franchiseId]);

    sendSuccess(res, 'Dashboard data retrieved', {
      totalInvoices: invoicesResult[0].count || 0,
      totalProducts: productsResult[0].count || 0,
      totalRevenue: revenueResult[0].total_revenue || 0,
      lowStockProducts: lowStockResult[0].count || 0,
      recentInvoices
    });
  } catch (error) {
    console.error('Get franchise dashboard error:', error);
    sendError(res, error.message || 'Failed to get dashboard data', 500);
  }
});

module.exports = router;
