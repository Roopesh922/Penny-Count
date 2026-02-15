/*
  # Fix Expenses Tracking and Filtering

  1. Changes
    - Add `added_by` column to track who actually added the expense (owner, co-owner, or agent)
    - Update RLS policy to properly filter expenses based on line assignments
    - Owners see expenses from agents they own
    - Co-owners see expenses from agents assigned to their lines
    - Agents see their own expenses
    
  2. Security
    - Maintains proper data isolation between different owners
    - Co-owners can only see expenses from agents assigned to their lines
    - Proper tracking of who added each expense
*/

-- Add added_by column to track who actually added the expense
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' AND column_name = 'added_by'
  ) THEN
    ALTER TABLE expenses ADD COLUMN added_by uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Update existing expenses to set added_by to submitted_by if not set
UPDATE expenses 
SET added_by = submitted_by
WHERE added_by IS NULL AND submitted_by IS NOT NULL;

-- Drop the existing expenses SELECT policy
DROP POLICY IF EXISTS "Users can view expenses based on role and assignment" ON expenses;
DROP POLICY IF EXISTS "Users can view expenses from their team" ON expenses;

-- Create updated expenses SELECT policy with proper filtering
CREATE POLICY "Users can view expenses based on role and line assignment"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    -- Users can see expenses they submitted (agents see their own)
    submitted_by = auth.uid()
    OR
    -- Owners can see expenses from agents they added (check the submitted_by agent was added by owner)
    (
      EXISTS (
        SELECT 1 FROM users AS requesting_user
        WHERE requesting_user.id = auth.uid()
        AND requesting_user.role = 'owner'
        AND EXISTS (
          SELECT 1 FROM users AS expense_agent
          WHERE expense_agent.id = expenses.submitted_by
          AND expense_agent.added_by = auth.uid()
          AND expense_agent.role = 'agent'
        )
      )
    )
    OR
    -- Co-owners can see expenses from agents assigned to lines they co-own
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
