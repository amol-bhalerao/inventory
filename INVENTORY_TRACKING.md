# Inventory Tracking & Stock Management Implementation

## Overview

Real-time inventory management has been implemented to automatically track stock changes when:

- **Invoices are created** - Stock is debited (reduced)
- **Invoices are deleted** - Stock is restored (credited)
- **Purchase bills are approved** - Stock is credited (increased)
- **Purchase bills are deleted** - Stock is debited (decreased)

## Changes Made

### 1. Invoice Controller (`invoiceController.js`)

**Modified:** `/backend/src/controllers/invoiceController.js`

#### Create Invoice (Update)

- Added imports for `StockTransaction` and `Product` models
- When creating invoice items, automatically creates stock transactions:
  - **Transaction Type:** `sale`
  - **Quantity Change:** Negative (deducts from stock)
  - **Reference:** Links to invoice ID
  - Updates `products.quantity_on_hand` for each item

#### Delete Invoice (Update)

- When deleting an invoice, reverses all stock transactions:
  - **Transaction Type:** `return`
  - **Quantity Change:** Positive (restores to stock)
  - Creates reversal entry in stock_transactions table for audit trail
  - Restores product stock to pre-sale level

**Example Flow:**

```
Invoice Created with Item:
  - Product: Solar Panel, Qty: 10
  - Stock Before: 50
  - Stock After: 40 (50 - 10)
  - Stock Transaction Created (sale, -10 units)

Invoice Deleted:
  - Stock Transaction Created (return, +10 units)
  - Stock Updated: 50 (back to original)
```

### 2. Purchase Bill Controller (`purchaseBillController.js`)

**Modified:** `/backend/src/controllers/purchaseBillController.js`

#### Approve/Apply Bill (Update)

- Added imports for `StockTransaction` model
- When approving purchase bill:
  - For new products: Creates stock transaction with positive quantity
  - For existing products: Creates stock transaction with positive quantity
  - **Transaction Type:** `purchase`
  - **Quantity Change:** Positive (adds to stock)
  - Updates `products.quantity_on_hand` for each item

#### Delete Bill (Update)

- When deleting an approved bill, reverses stock transactions:
  - Checks if bill status is `approved`
  - Creates reversal stock transactions with:
    - **Transaction Type:** `adjustment`
    - **Quantity Change:** Negative (removes added stock)
  - Restores product stock to pre-purchase level

**Example Flow:**

```
Purchase Bill Approved with Item:
  - Product: Solar Panel, Qty: 50
  - Stock Before: 40
  - Stock After: 90 (40 + 50)
  - Stock Transaction Created (purchase, +50 units)

Bill Deleted:
  - Stock Transaction Created (adjustment, -50 units)
  - Stock Updated: 40 (back to original)
```

## Stock Transaction Types

| Type         | Quantity | Triggered By                | Reference      |
| ------------ | -------- | --------------------------- | -------------- |
| `purchase`   | Positive | Bill Approval               | purchase_bill  |
| `sale`       | Negative | Invoice Creation            | invoice        |
| `return`     | Positive | Invoice Deletion            | invoice_return |
| `adjustment` | Any      | Manual or Bill Cancellation | adjustment     |

## Database Tables

### products

- `quantity_on_hand` - Updated in real-time with each transaction

### stock_transactions

```sql
CREATE TABLE stock_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  franchise_id INT,
  product_id INT,
  transaction_type ENUM('purchase', 'sale', 'adjustment', 'return'),
  quantity_change INT,
  reference_id INT,
  reference_type VARCHAR(50),
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP,
  FOREIGN KEY (franchise_id) REFERENCES franchises(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

## Features

### ✅ Real-Time Stock Updates

- Stock is updated immediately when transactions occur
- No manual intervention required

### ✅ Audit Trail

- Every stock change is logged in `stock_transactions` table
- References the source document (invoice, bill, etc.)
- Tracks user who made the change

### ✅ Automatic Reversals

- Deleting invoices/bills automatically reverses stock changes
- Maintains stock accuracy even after deletions

### ✅ Product Creation During Bills

- New products created during bill approval automatically get stock
- Stock transactions created for these products as well

## How to Use

### Track Stock Movement

Use the Stock Controller endpoints:

```
GET /api/stock/transactions - Get all transactions for franchise
GET /api/stock/product/:id - Get transaction history for product
GET /api/stock/report - Get movement report for date range
```

### View Current Stock

Check `products.quantity_on_hand` field:

```
GET /api/products/:id
```

This field is updated in real-time with each transaction.

### Monitor Low Stock

Products with `quantity_on_hand <= reorder_level` are considered low stock:

```
GET /api/products/low-stock - Get products needing reorder
```

## Error Handling

- Stock transactions are created with error handling
- If a stock transaction fails, the main operation (invoice/bill) continues
- Errors are logged for debugging
- Stock updates use database transactions for consistency

## Future Enhancements

1. **Stock Reservations** - Reserve stock on PO creation
2. **Stock Forecasting** - Predict low stock based on trends
3. **Multi-location Support** - Track stock across multiple warehouses
4. **Movement Alerts** - Alert on significant stock changes
5. **Stock Reconciliation** - Physical count vs system count

## Testing

To verify stock tracking is working:

### Invoice Test

1. Create invoice with known products and quantities
2. Check `stock_transactions` table - should have new `sale` entry
3. Check `products.quantity_on_hand` - should be reduced
4. Delete invoice
5. Check `stock_transactions` - should have new `return` entry
6. Check `products.quantity_on_hand` - should be restored

### Purchase Test

1. Create purchase bill with known products and quantities
2. Approve bill
3. Check `stock_transactions` - should have new `purchase` entry
4. Check `products.quantity_on_hand` - should be increased
5. Delete bill
6. Check `stock_transactions` - should have new `adjustment` entry
7. Check `products.quantity_on_hand` - should be restored
