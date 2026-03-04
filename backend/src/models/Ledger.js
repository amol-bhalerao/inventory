// Ledger Model/Repository
const { query, queryOne } = require('../utils/database');

class Ledger {
  static async createEntry(entryData) {
    const sql = `
      INSERT INTO general_ledger (franchise_id, account_id, journal_entry_id, 
        entry_date, debit, credit, description, reference_id, reference_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await query(sql, [
      entryData.franchiseId,
      entryData.accountId,
      entryData.journalEntryId || null,
      entryData.entryDate,
      entryData.debit || 0,
      entryData.credit || 0,
      entryData.description || null,
      entryData.referenceId || null,
      entryData.referenceType || null
    ]);

    return { id: result.insertId, ...entryData };
  }

  static async getAccountBalance(accountId, upToDate = null) {
    let sql = `
      SELECT 
        COALESCE(SUM(debit), 0) as total_debit,
        COALESCE(SUM(credit), 0) as total_credit,
        COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) as balance
      FROM general_ledger
      WHERE account_id = ? AND deleted_at IS NULL
    `;
    let params = [accountId];

    if (upToDate) {
      sql += ' AND entry_date <= ?';
      params.push(upToDate);
    }

    return await queryOne(sql, params);
  }

  static async getTrialBalance(franchiseId, asOfDate = null) {
    let sql = `
      SELECT 
        a.id,
        a.account_code,
        a.account_name,
        a.account_type,
        COALESCE(SUM(gl.debit), 0) as debit,
        COALESCE(SUM(gl.credit), 0) as credit,
        COALESCE(SUM(gl.debit), 0) - COALESCE(SUM(gl.credit), 0) as balance
      FROM accounts a
      LEFT JOIN general_ledger gl ON a.id = gl.account_id AND gl.deleted_at IS NULL
      WHERE a.franchise_id = ? AND a.is_active = 1
    `;
    let params = [franchiseId];

    if (asOfDate) {
      sql += ' AND gl.entry_date <= ?';
      params.push(asOfDate);
    }

    sql += ' GROUP BY a.id, a.account_code, a.account_name, a.account_type';

    return await query(sql, params);
  }

  static async getAccountLedger(accountId, limit = 100, offset = 0) {
    const sql = `
      SELECT * FROM general_ledger
      WHERE account_id = ? AND deleted_at IS NULL
      ORDER BY entry_date DESC, id DESC
      LIMIT ? OFFSET ?
    `;
    return await query(sql, [accountId, limit, offset]);
  }

  static async getIncomeStatement(franchiseId, startDate, endDate) {
    const sql = `
      SELECT 
        a.account_code,
        a.account_name,
        a.account_type,
        COALESCE(SUM(gl.debit), 0) as debit,
        COALESCE(SUM(gl.credit), 0) as credit,
        COALESCE(SUM(gl.credit - gl.debit), 0) as amount
      FROM accounts a
      LEFT JOIN general_ledger gl ON a.id = gl.account_id 
        AND gl.entry_date >= ? AND gl.entry_date <= ? AND gl.deleted_at IS NULL
      WHERE a.franchise_id = ? AND a.account_type IN ('revenue', 'expense')
      GROUP BY a.id, a.account_code, a.account_name, a.account_type
      ORDER BY a.account_type, a.account_code
    `;
    return await query(sql, [startDate, endDate, franchiseId]);
  }

  static async getBalanceSheet(franchiseId, asOfDate = null) {
    let sql = `
      SELECT 
        a.account_code,
        a.account_name,
        a.account_type,
        COALESCE(SUM(gl.debit), 0) as debit,
        COALESCE(SUM(gl.credit), 0) as credit,
        COALESCE(SUM(gl.debit - gl.credit), 0) as balance
      FROM accounts a
      LEFT JOIN general_ledger gl ON a.id = gl.account_id AND gl.deleted_at IS NULL
      WHERE a.franchise_id = ? AND a.account_type IN ('asset', 'liability', 'equity')
    `;
    let params = [franchiseId];

    if (asOfDate) {
      sql += ' AND gl.entry_date <= ?';
      params.push(asOfDate);
    }

    sql += ` GROUP BY a.id, a.account_code, a.account_name, a.account_type
             ORDER BY a.account_type, a.account_code`;

    return await query(sql, params);
  }
}

module.exports = Ledger;
