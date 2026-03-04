-- Patch: Add Missing Product Fields (GST Percentage and HSN Code)
-- This patch adds gst_percentage and hsn_code columns to products table if they don't exist
-- Run this separately if you encounter column not found errors

-- Add gst_percentage column if it doesn't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS gst_percentage DECIMAL(5,2) DEFAULT 0 AFTER reorder_level;

-- Add hsn_code column if it doesn't exist  
ALTER TABLE products ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20) AFTER gst_percentage;

-- Add index on gst_percentage for faster queries
ALTER TABLE products ADD INDEX IF NOT EXISTS idx_gst_percentage (gst_percentage);

-- Verify selling_price column exists (should already be there from initial schema)
ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_price DECIMAL(12,2) DEFAULT 0 AFTER purchase_price;

-- Update any null values to 0 for numeric fields
UPDATE products SET gst_percentage = 0 WHERE gst_percentage IS NULL;
UPDATE products SET selling_price = 0 WHERE selling_price IS NULL;
UPDATE products SET hsn_code = '' WHERE hsn_code IS NULL;

-- Display schema to verify all fields
DESCRIBE products;
