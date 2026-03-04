// Ledger/Accounting Routes
const express = require('express');
const router = express.Router();
const ledgerController = require('../controllers/ledgerController');
const { authenticateToken } = require('../middleware/auth');

// Get account balance
router.get('/account/:accountId/balance', authenticateToken, ledgerController.getAccountBalance);

// Get account ledger (detailed transactions)
router.get('/account/:accountId', authenticateToken, ledgerController.getAccountLedger);

// Get trial balance
router.get('/reports/trial-balance', authenticateToken, ledgerController.getTrialBalance);

// Get income statement (P&L)
router.get('/reports/income-statement', authenticateToken, ledgerController.getIncomeStatement);

// Get balance sheet
router.get('/reports/balance-sheet', authenticateToken, ledgerController.getBalanceSheet);

module.exports = router;
