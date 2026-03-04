-- Migration: Add quotation enhancement columns for letter body and terms
-- This migration adds new columns to support the quotation letter-based design

-- Add letter_body column if it doesn't exist
ALTER TABLE quotations ADD COLUMN letter_body LONGTEXT DEFAULT NULL;

-- Add payment_terms column if it doesn't exist
ALTER TABLE quotations ADD COLUMN payment_terms VARCHAR(255) DEFAULT '';

-- Add delivery_time column if it doesn't exist
ALTER TABLE quotations ADD COLUMN delivery_time VARCHAR(255) DEFAULT '';

-- Add warranty column if it doesn't exist
ALTER TABLE quotations ADD COLUMN warranty VARCHAR(255) DEFAULT '';

-- Add reference_number column if it doesn't exist
ALTER TABLE quotations ADD COLUMN reference_number VARCHAR(100) DEFAULT NULL;

-- Add terms column to store Terms & Conditions text
ALTER TABLE quotations ADD COLUMN terms LONGTEXT DEFAULT NULL;

-- Add hsn_code column to quotation_items if it doesn't exist
ALTER TABLE quotation_items ADD COLUMN hsn_code VARCHAR(50) DEFAULT NULL;
