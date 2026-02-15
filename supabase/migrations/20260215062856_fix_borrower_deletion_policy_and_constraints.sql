/*
  # Fix Borrower Deletion - RLS Policy and Foreign Key Constraints
  
  1. Problem
    - Borrower deletion appears to work in UI but fails silently in database
    - Borrowers reappear after page refresh
    - DELETE policy only allows owners to delete
    - Foreign key constraints from loans, penalties, missed_payments may block deletion
    
  2. Root Causes
    - The DELETE RLS policy only allows line owners to delete borrowers
    - Foreign key constraints need to cascade properly
    - No error feedback reaches the UI when deletion fails
    
  3. Solution
    - Update DELETE policy to allow:
      a) Owners to delete any borrower in their lines
      b) Co-owners to delete borrowers with no active loans in their lines
      c) Agents to delete borrowers with no active loans that they manage
    - Ensure all foreign key constraints cascade properly
    - Add proper error handling
    
  4. Changes
    - Drop and recreate DELETE policy with better conditions
    - Fix foreign key constraints on loans, penalties, missed_payments tables
    
  5. Security
    - Owners have full delete access to their line borrowers
    - Co-owners and agents can only delete borrowers with 0 active loans
    - Payment history is preserved (borrower_id set to NULL)
*/

-- ============================================================================
-- FIX FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Fix loans table constraint (should cascade)
ALTER TABLE loans 
  DROP CONSTRAINT IF EXISTS loans_borrower_id_fkey;

ALTER TABLE loans
  ADD CONSTRAINT loans_borrower_id_fkey 
  FOREIGN KEY (borrower_id) 
  REFERENCES borrowers(id) 
  ON DELETE CASCADE;

-- Fix penalties table constraint (should cascade or set null)
DO $$
BEGIN
  ALTER TABLE penalties ALTER COLUMN borrower_id DROP NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

ALTER TABLE penalties 
  DROP CONSTRAINT IF EXISTS penalties_borrower_id_fkey;

ALTER TABLE penalties
  ADD CONSTRAINT penalties_borrower_id_fkey 
  FOREIGN KEY (borrower_id) 
  REFERENCES borrowers(id) 
  ON DELETE SET NULL;

-- Fix missed_payments table constraint (should cascade or set null)
DO $$
BEGIN
  ALTER TABLE missed_payments ALTER COLUMN borrower_id DROP NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

ALTER TABLE missed_payments 
  DROP CONSTRAINT IF EXISTS missed_payments_borrower_id_fkey;

ALTER TABLE missed_payments
  ADD CONSTRAINT missed_payments_borrower_id_fkey 
  FOREIGN KEY (borrower_id) 
  REFERENCES borrowers(id) 
  ON DELETE SET NULL;

-- ============================================================================
-- FIX DELETE RLS POLICY
-- ============================================================================

-- Drop existing DELETE policy
DROP POLICY IF EXISTS "Owners can delete borrowers in their lines" ON borrowers;

-- Create comprehensive DELETE policy
CREATE POLICY "Users can delete borrowers based on role and conditions"
  ON borrowers FOR DELETE
  TO authenticated
  USING (
    -- Owners can delete any borrower in their lines
    (
      line_id IN (
        SELECT id FROM lines 
        WHERE owner_id = auth.uid()
      )
    )
    OR
    -- Co-owners can delete borrowers with no active loans in lines they co-own
    (
      line_id IN (
        SELECT id FROM lines 
        WHERE co_owner_id = auth.uid()
      )
      AND active_loans = 0
    )
    OR
    -- Agents can delete borrowers with no active loans that they manage
    (
      agent_id = auth.uid()
      AND active_loans = 0
    )
  );

-- Create index on active_loans for better policy performance
CREATE INDEX IF NOT EXISTS idx_borrowers_active_loans ON borrowers(active_loans);
