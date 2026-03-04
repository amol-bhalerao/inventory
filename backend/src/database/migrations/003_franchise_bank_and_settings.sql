-- Add bank and general setting columns to franchises
ALTER TABLE franchises
  ADD COLUMN bank_name VARCHAR(255) NULL,
  ADD COLUMN account_number VARCHAR(50) NULL,
  ADD COLUMN ifsc_code VARCHAR(20) NULL,
  ADD COLUMN branch VARCHAR(100) NULL,
  ADD COLUMN invoice_prefix VARCHAR(20) NOT NULL DEFAULT 'QT-',
  ADD COLUMN default_gst DECIMAL(5,2) NOT NULL DEFAULT 18,
  ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'INR';
