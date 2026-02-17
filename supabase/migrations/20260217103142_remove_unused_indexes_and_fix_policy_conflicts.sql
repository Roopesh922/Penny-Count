/*
  # Remove Unused Indexes and Fix Policy Conflicts
  
  1. Problem
    - Several indexes exist but are not being used by queries
    - Unused indexes waste storage space and slow down writes
    - The borrowers table has two conflicting DELETE policies
    
  2. Solution
    - Remove indexes that are not being used
    - Keep only the most comprehensive DELETE policy on borrowers
    
  3. Changes
    - Remove unused indexes:
      - idx_users_approval_status
      - idx_payments_borrower_id
      - idx_agent_locations_last_updated
      - idx_borrowers_active_loans
      - idx_deletion_requests_owner_id
      - idx_deletion_requests_status
      - idx_deletion_requests_requester_id
    - Remove redundant DELETE policy on borrowers table
    
  4. Notes
    - We keep idx_borrowers_phone and idx_users_phone as they're used by our validation trigger
    - The comprehensive DELETE policy handles all deletion scenarios
*/

-- ============================================================================
-- REMOVE UNUSED INDEXES
-- ============================================================================

-- Users table - approval status is not queried frequently enough
DROP INDEX IF EXISTS idx_users_approval_status;

-- Payments table - borrower_id is not used in queries (we use loan_id)
DROP INDEX IF EXISTS idx_payments_borrower_id;

-- Agent locations - last_updated is not queried directly
DROP INDEX IF EXISTS idx_agent_locations_last_updated;

-- Borrowers table - active_loans is checked but not indexed in queries
DROP INDEX IF EXISTS idx_borrowers_active_loans;

-- Deletion requests - these fields are not queried frequently enough
DROP INDEX IF EXISTS idx_deletion_requests_owner_id;
DROP INDEX IF EXISTS idx_deletion_requests_status;
DROP INDEX IF EXISTS idx_deletion_requests_requester_id;

-- ============================================================================
-- FIX MULTIPLE PERMISSIVE POLICIES ON BORROWERS TABLE
-- ============================================================================

-- Remove the redundant "Line owners can delete borrowers" policy
-- The comprehensive "Users can delete borrowers based on role and conditions" 
-- policy already covers this scenario and more
DROP POLICY IF EXISTS "Line owners can delete borrowers" ON borrowers;

/*
  EXPLANATION:
  The "Users can delete borrowers based on role and conditions" policy includes:
  1. Owners can delete any borrower in their lines (same as the removed policy)
  2. Co-owners can delete borrowers with no active loans
  3. Agents can delete their borrowers with no active loans
  
  Therefore, the "Line owners can delete borrowers" policy is redundant.
*/
