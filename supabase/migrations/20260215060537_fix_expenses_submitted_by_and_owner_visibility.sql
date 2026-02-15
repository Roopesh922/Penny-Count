/*
  # Fix Expenses Submitted By and Owner Visibility
  
  1. Data Fixes
    - Update existing expenses where submitted_by is a co-owner/owner to use the line's agent instead
    - This ensures expenses show under the correct agent's name
    
  2. RLS Policy Updates
    - Update the SELECT policy to allow owners to see expenses where:
      * The agent (submitted_by) was added by the owner, OR
      * The person who added the expense (added_by) was added by the owner (co-owner case)
    - This ensures owners can see all expenses from their team members
    
  3. Security
    - Maintains proper data isolation between different owners
    - Ensures co-owner added expenses are visible to owners
*/

-- Update existing expenses to use the line's agent instead of co-owner/owner
UPDATE expenses e
SET submitted_by = l.agent_id
FROM lines l
WHERE e.line_id = l.id
  AND l.agent_id IS NOT NULL
  AND e.submitted_by IN (
    SELECT id FROM users WHERE role IN ('owner', 'co-owner')
  );

-- Drop the existing expenses SELECT policy
DROP POLICY IF EXISTS "Users can view expenses based on role and line assignment" ON expenses;

-- Create updated expenses SELECT policy with proper filtering for owner visibility
CREATE POLICY "Users can view expenses based on role and line assignment"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    -- Users can see expenses they submitted (agents see their own)
    submitted_by = auth.uid()
    OR
    -- Owners can see expenses from agents they added
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
    -- Owners can see expenses added by co-owners they added (even if submitted_by is different)
    (
      EXISTS (
        SELECT 1 FROM users AS requesting_user
        WHERE requesting_user.id = auth.uid()
        AND requesting_user.role = 'owner'
        AND EXISTS (
          SELECT 1 FROM users AS expense_adder
          WHERE expense_adder.id = expenses.added_by
          AND expense_adder.added_by = auth.uid()
          AND expense_adder.role = 'co-owner'
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
    OR
    -- Co-owners can see expenses they added themselves
    (
      EXISTS (
        SELECT 1 FROM users AS requesting_user
        WHERE requesting_user.id = auth.uid()
        AND requesting_user.role = 'co-owner'
        AND expenses.added_by = auth.uid()
      )
    )
  );
