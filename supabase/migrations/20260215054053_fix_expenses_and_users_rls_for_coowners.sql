/*
  # Fix Expenses and Users RLS for Co-owners

  1. Changes
    - Update expenses SELECT policy to properly filter for owners and co-owners
    - Owners can only see expenses from agents/co-owners they added
    - Co-owners can see expenses from agents assigned to their lines (regardless of expense line_id)
    - Agents can always see their own expenses
    
  2. Security
    - Maintains proper data isolation between different owners
    - Co-owners can only see expenses from their assigned agents
    - Users can always see their own expenses
*/

-- Drop the existing expenses SELECT policy
DROP POLICY IF EXISTS "Users can view expenses for their lines" ON expenses;

-- Create updated expenses SELECT policy with proper filtering
CREATE POLICY "Users can view expenses based on role and assignment"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    -- Users can see their own expenses
    submitted_by = auth.uid()
    OR
    -- Owners can see expenses from agents/co-owners they added
    (
      EXISTS (
        SELECT 1 FROM users AS requesting_user
        WHERE requesting_user.id = auth.uid()
        AND requesting_user.role = 'owner'
        AND EXISTS (
          SELECT 1 FROM users AS expense_submitter
          WHERE expense_submitter.id = expenses.submitted_by
          AND expense_submitter.added_by = auth.uid()
        )
      )
    )
    OR
    -- Co-owners can see expenses from agents assigned to their lines
    (
      EXISTS (
        SELECT 1 FROM users AS requesting_user
        WHERE requesting_user.id = auth.uid()
        AND requesting_user.role = 'co-owner'
        AND EXISTS (
          SELECT 1 FROM lines
          WHERE lines.co_owner_id = auth.uid()
          AND lines.agent_id = expenses.submitted_by
        )
      )
    )
  );
