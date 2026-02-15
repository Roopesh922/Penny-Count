/*
  # Add Triggers to Auto-Update Borrower Loan Counts
  
  1. Problem
    - The borrowers table has `active_loans` and `total_loans` columns
    - These counts are not automatically updated when loans are created/updated/deleted
    - This causes inconsistency between the Borrowers tab and Loans tab
    
  2. Solution
    - Create a function to recalculate borrower loan counts
    - Add triggers on the loans table to call this function automatically
    - Triggers fire on INSERT, UPDATE (status changes), and DELETE
    
  3. Changes
    - Create `update_borrower_loan_counts()` function
    - Add trigger `after_loan_insert` on loans table
    - Add trigger `after_loan_update` on loans table
    - Add trigger `after_loan_delete` on loans table
    
  4. Security
    - Functions run with SECURITY DEFINER to ensure they can update borrower counts
    - No changes to RLS policies needed
*/

-- Function to update borrower loan counts
CREATE OR REPLACE FUNCTION update_borrower_loan_counts()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_borrower_id uuid;
  v_total_count integer;
  v_active_count integer;
BEGIN
  -- Determine which borrower ID to update
  IF TG_OP = 'DELETE' THEN
    v_borrower_id := OLD.borrower_id;
  ELSE
    v_borrower_id := NEW.borrower_id;
  END IF;

  -- Skip if borrower_id is NULL (shouldn't happen, but safety check)
  IF v_borrower_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Count total loans for this borrower
  SELECT COUNT(*)
  INTO v_total_count
  FROM loans
  WHERE borrower_id = v_borrower_id;

  -- Count active loans for this borrower
  SELECT COUNT(*)
  INTO v_active_count
  FROM loans
  WHERE borrower_id = v_borrower_id
    AND status = 'active';

  -- Update the borrower record
  UPDATE borrowers
  SET 
    total_loans = v_total_count,
    active_loans = v_active_count
  WHERE id = v_borrower_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS after_loan_insert ON loans;
DROP TRIGGER IF EXISTS after_loan_update ON loans;
DROP TRIGGER IF EXISTS after_loan_delete ON loans;

-- Create trigger for INSERT
CREATE TRIGGER after_loan_insert
  AFTER INSERT ON loans
  FOR EACH ROW
  EXECUTE FUNCTION update_borrower_loan_counts();

-- Create trigger for UPDATE (only when status or borrower_id changes)
CREATE TRIGGER after_loan_update
  AFTER UPDATE OF status, borrower_id ON loans
  FOR EACH ROW
  WHEN (
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.borrower_id IS DISTINCT FROM NEW.borrower_id
  )
  EXECUTE FUNCTION update_borrower_loan_counts();

-- Create trigger for DELETE
CREATE TRIGGER after_loan_delete
  AFTER DELETE ON loans
  FOR EACH ROW
  EXECUTE FUNCTION update_borrower_loan_counts();

-- Recalculate counts for all existing borrowers
DO $$
DECLARE
  borrower_record RECORD;
  v_total_count integer;
  v_active_count integer;
BEGIN
  FOR borrower_record IN SELECT id FROM borrowers
  LOOP
    -- Count total loans
    SELECT COUNT(*)
    INTO v_total_count
    FROM loans
    WHERE borrower_id = borrower_record.id;

    -- Count active loans
    SELECT COUNT(*)
    INTO v_active_count
    FROM loans
    WHERE borrower_id = borrower_record.id
      AND status = 'active';

    -- Update the borrower
    UPDATE borrowers
    SET 
      total_loans = v_total_count,
      active_loans = v_active_count
    WHERE id = borrower_record.id;
  END LOOP;
END $$;
