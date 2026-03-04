// Hash and security utilities
const bcrypt = require('bcryptjs');
const { queryOne } = require('./database');

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Get financial year (April to March in India)
const getFinancialYear = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1; // 1-12

  // If month is before April (1-3), current FY is previous year to current year
  // If month is April or after (4-12), current FY is current year to next year
  if (month < 4) {
    return `${year - 1}-${year}`;
  } else {
    return `${year}-${year + 1}`;
  }
};

const generateInvoiceNumber = async (franchiseId) => {
  try {
    const currentFY = getFinancialYear();

    // Get the last invoice for this franchise in the current financial year
    const sql = `
      SELECT invoice_number FROM invoices 
      WHERE franchise_id = ? AND deleted_at IS NULL AND YEAR(created_at) >= ? 
      ORDER BY id DESC LIMIT 1
    `;
    const currentYear = parseInt(currentFY.split('-')[0]);
    const lastInvoice = await queryOne(sql, [franchiseId, currentYear]);

    let nextNumber = 1;
    if (lastInvoice && lastInvoice.invoice_number) {
      // Extract number from format like INV-2025-2026-0001
      const match = lastInvoice.invoice_number.match(/(\d{4})$/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    return `INV-${currentFY}-${String(nextNumber).padStart(4, '0')}`;
  } catch (error) {
    console.error('Invoice number generation error:', error);
    // Fallback to timestamp-based generation if database query fails
    const timestamp = Date.now().toString().slice(-6);
    return `INV-${franchiseId}-${timestamp}`;
  }
};

const generatePONumber = (franchiseId) => {
  const timestamp = Date.now().toString().slice(-6);
  return `PO-${franchiseId}-${timestamp}`;
};

const generateQuotationNumber = async (franchiseId) => {
  try {
    const currentFY = getFinancialYear();
    const currentYear = parseInt(currentFY.split('-')[0]);

    // Get the last quotation for this franchise in the current financial year
    const sql = `
      SELECT quotation_number FROM quotations 
      WHERE franchise_id = ? AND deleted_at IS NULL AND YEAR(created_at) >= ? 
      ORDER BY id DESC LIMIT 1
    `;
    const lastQuotation = await queryOne(sql, [franchiseId, currentYear]);

    let nextNumber = 1;
    if (lastQuotation && lastQuotation.quotation_number) {
      // Extract number from format like QT-2025-001
      const match = lastQuotation.quotation_number.match(/(\d{3})$/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    // Format: QT-[Year]-[Serial] e.g., QT-2025-001
    return `QT-${currentYear}-${String(nextNumber).padStart(3, '0')}`;
  } catch (error) {
    console.error('Quotation number generation error:', error);
    // Fallback to timestamp-based generation if database query fails
    const timestamp = Date.now().toString().slice(-6);
    return `QT-${franchiseId}-${timestamp}`;
  }
};

const calculateLineTotal = (quantity, unitPrice) => {
  return parseFloat((quantity * unitPrice).toFixed(2));
};

const calculateTotals = (items) => {
  let subtotal = 0;
  let totalTax = 0;

  items.forEach(item => {
    const itemSubtotal = calculateLineTotal(item.quantity, item.unitPrice);
    const itemTax = parseFloat((itemSubtotal * (item.taxRate / 100)).toFixed(2));

    subtotal += itemSubtotal;
    totalTax += itemTax;
  });

  subtotal = parseFloat(subtotal.toFixed(2));
  const total = parseFloat((subtotal + totalTax).toFixed(2));

  return { subtotal, totalTax, total };
};

module.exports = {
  hashPassword,
  comparePassword,
  generateInvoiceNumber,
  generatePONumber,
  generateQuotationNumber,
  calculateLineTotal,
  calculateTotals,
  getFinancialYear
};
