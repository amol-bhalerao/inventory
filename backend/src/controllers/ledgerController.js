// Ledger/Accounting Controller
const Ledger = require('../models/Ledger');
const { sendSuccess, sendError } = require('../utils/response');

// Get account balance
exports.getAccountBalance = async (req, res) => {
  try {
    const { accountId } = req.params;
    const { asOfDate } = req.query;

    const balance = await Ledger.getAccountBalance(accountId, asOfDate);

    sendSuccess(res, 'Account balance retrieved', balance);
  } catch (error) {
    console.error('Get account balance error:', error);
    sendError(res, error.message || 'Failed to get account balance', 500);
  }
};

// Get trial balance
exports.getTrialBalance = async (req, res) => {
  try {
    const { asOfDate } = req.query;

    const trialBalance = await Ledger.getTrialBalance(req.user.franchiseId, asOfDate);

    // Calculate totals
    let totalDebits = 0;
    let totalCredits = 0;

    trialBalance.forEach(account => {
      totalDebits += parseFloat(account.debit) || 0;
      totalCredits += parseFloat(account.credit) || 0;
    });

    sendSuccess(res, 'Trial balance retrieved', {
      accounts: trialBalance,
      totalDebits: totalDebits.toFixed(2),
      totalCredits: totalCredits.toFixed(2),
      balanced: Math.abs(totalDebits - totalCredits) < 0.01
    });
  } catch (error) {
    console.error('Get trial balance error:', error);
    sendError(res, error.message || 'Failed to get trial balance', 500);
  }
};

// Get income statement
exports.getIncomeStatement = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return sendError(res, 'Start date and end date are required', 400);
    }

    const statement = await Ledger.getIncomeStatement(req.user.franchiseId, startDate, endDate);

    // Separate revenues and expenses
    const revenues = statement.filter(a => a.account_type === 'revenue');
    const expenses = statement.filter(a => a.account_type === 'expense');

    let totalRevenue = 0;
    let totalExpense = 0;

    revenues.forEach(a => totalRevenue += parseFloat(a.amount) || 0);
    expenses.forEach(a => totalExpense += parseFloat(a.amount) || 0);

    const netIncome = totalRevenue - totalExpense;

    sendSuccess(res, 'Income statement retrieved', {
      revenues,
      expenses,
      totalRevenue: totalRevenue.toFixed(2),
      totalExpense: totalExpense.toFixed(2),
      netIncome: netIncome.toFixed(2),
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('Get income statement error:', error);
    sendError(res, error.message || 'Failed to get income statement', 500);
  }
};

// Get balance sheet
exports.getBalanceSheet = async (req, res) => {
  try {
    const { asOfDate } = req.query;

    const statement = await Ledger.getBalanceSheet(req.user.franchiseId, asOfDate);

    // Separate by type
    const assets = statement.filter(a => a.account_type === 'asset');
    const liabilities = statement.filter(a => a.account_type === 'liability');
    const equity = statement.filter(a => a.account_type === 'equity');

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    assets.forEach(a => totalAssets += parseFloat(a.balance) || 0);
    liabilities.forEach(a => totalLiabilities += parseFloat(a.balance) || 0);
    equity.forEach(a => totalEquity += parseFloat(a.balance) || 0);

    sendSuccess(res, 'Balance sheet retrieved', {
      assets,
      liabilities,
      equity,
      totalAssets: totalAssets.toFixed(2),
      totalLiabilities: totalLiabilities.toFixed(2),
      totalEquity: totalEquity.toFixed(2),
      balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
      asOfDate: asOfDate || new Date().toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Get balance sheet error:', error);
    sendError(res, error.message || 'Failed to get balance sheet', 500);
  }
};

// Get account ledger
exports.getAccountLedger = async (req, res) => {
  try {
    const { accountId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const ledger = await Ledger.getAccountLedger(accountId, limit, offset);

    sendSuccess(res, 'Account ledger retrieved', { ledger });
  } catch (error) {
    console.error('Get account ledger error:', error);
    sendError(res, error.message || 'Failed to get account ledger', 500);
  }
};
