/*
  # Fix Duplicate Borrowers and Add Phone Uniqueness
  
  1. Problem
    - Multiple borrowers exist with the same phone number in the same line
    - No constraint prevents creating duplicate phone numbers
    - Borrowers can use phone numbers that belong to users
    
  2. Solution
    - Remove duplicate borrowers (keep the most recent one)
    - Add unique constraint on (phone, line_id) combination
    - Add validation to prevent using user phone numbers
    
  3. Changes
    - Delete older duplicate borrowers, keeping the newest
    - Add unique constraint on borrowers.phone per line
    - Create validation function for user phone numbers
    - Add trigger to enforce validation
    
  4. Security
    - No changes to RLS policies needed
    - Validation happens at database level
*/

-- ============================================================================
-- REMOVE DUPLICATE BORROWERS
-- ============================================================================

-- Delete duplicate borrowers, keeping only the most recent one for each phone/line combination
DELETE FROM borrowers a
USING borrowers b
WHERE 
  a.phone = b.phone AND
  a.line_id = b.line_id AND
  a.id < b.id;

-- ============================================================================
-- ADD UNIQUE CONSTRAINT ON PHONE PER LINE
-- ============================================================================

-- Add unique constraint on phone and line_id combination
ALTER TABLE borrowers
  ADD CONSTRAINT borrowers_phone_line_id_unique 
  UNIQUE (phone, line_id);

-- ============================================================================
-- CREATE VALIDATION FUNCTION
-- ============================================================================

-- Function to check if a phone number belongs to any user
CREATE OR REPLACE FUNCTION validate_borrower_phone_not_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the phone number belongs to any user
  IF EXISTS (
    SELECT 1 FROM users 
    WHERE phone = NEW.phone
  ) THEN
    RAISE EXCEPTION 'This phone number belongs to a user (agent/co-owner/owner) and cannot be used for a borrower';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CREATE TRIGGER
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS validate_borrower_phone_trigger ON borrowers;

-- Create trigger to validate phone before insert or update
CREATE TRIGGER validate_borrower_phone_trigger
  BEFORE INSERT OR UPDATE OF phone
  ON borrowers
  FOR EACH ROW
  EXECUTE FUNCTION validate_borrower_phone_not_user();

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Create index on borrowers.phone for faster lookups
CREATE INDEX IF NOT EXISTS idx_borrowers_phone ON borrowers(phone);

-- Create index on users.phone for faster validation lookups
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
