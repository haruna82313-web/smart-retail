-- Delete payment_history table from database
-- This script removes the payment_history table as it's no longer needed

DROP TABLE IF EXISTS payment_history;

-- Note: This action is irreversible and will delete all payment history data
-- Make sure you have backups if you need this data for future reference
