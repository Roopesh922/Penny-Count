/*
  # Fix Borrower Deletion - Update Payments Foreign Key Constraint
  
  1. Problem
    - The payments table has a foreign key to borrowers with NO ACTION on delete
    - This blocks borrower deletion when payments exist
    - Borrowers appear to delete but the operation fails silently in the database
    
  2. Solution
    - Change the foreign key constraint from NO ACTION to SET NULL
    - This allows borrower deletion while preserving payment history for audit trails
    - When a borrower is deleted, their payments remain but borrower_id becomes NULL
    
  3. Changes
    - Drop existing foreign key constraint on payments.borrower_id
    - Recreate with ON DELETE SET NULL
    - Make borrower_id nullable if it isn't already
    
  4. Security
    - No changes to RLS policies needed
    - Payment history is preserved for financial auditing
*/

-- First, make borrower_id nullable if it isn't already
DO $$
BEGIN
  ALTER TABLE payments ALTER COLUMN borrower_id DROP NOT NULL;
EXCEPTION
  WHEN others THEN
    -- Column is already nullable, continue
    NULL;
END $$;

-- Drop the existing foreign key constraint
ALTER TABLE payments 
  DROP CONSTRAINT IF EXISTS payments_borrower_id_fkey;

-- Recreate the foreign key with ON DELETE SET NULL
ALTER TABLE payments
  ADD CONSTRAINT payments_borrower_id_fkey 
  FOREIGN KEY (borrower_id) 
  REFERENCES borrowers(id) 
  ON DELETE SET NULL;

-- Create an index on borrower_id for performance (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_payments_borrower_id ON payments(borrower_id);
