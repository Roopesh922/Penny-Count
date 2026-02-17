/*
  # Optimize RLS Policies with SELECT Wrappers
  
  1. Problem
    - Several RLS policies call auth.uid() directly in the USING clause
    - This causes the function to be re-evaluated for each row
    - At scale, this produces suboptimal query performance
    
  2. Solution
    - Replace all `auth.uid()` with `(select auth.uid())`
    - This evaluates the function once and caches the result
    - Significantly improves query performance on large datasets
    
  3. Changes
    - Update policies on:
      - users table (2 policies)
      - borrowers table (1 policy)
      - expenses table (1 policy)
      - borrower_deletion_requests table (3 policies)
    
  4. Performance Impact
    - Queries will run faster as auth.uid() is evaluated once per query
    - No functional changes, only performance optimization
*/

-- ============================================================================
-- USERS TABLE - Optimize Policies
-- ============================================================================

-- Drop and recreate: Users can update own profile or team members
DROP POLICY IF EXISTS "Users can update own profile or team members" ON users;

CREATE POLICY "Users can update own profile or team members"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    ((select auth.uid()) = id) OR 
    (added_by = (select auth.uid())) OR 
    (added_by IS NULL) OR 
    (added_by = id)
  )
  WITH CHECK (
    ((select auth.uid()) = id) OR 
    (added_by = (select auth.uid()))
  );

-- Drop and recreate: Users can view own profile, team members, and assigned agents
DROP POLICY IF EXISTS "Users can view own profile, team members, and assigned agents" ON users;

CREATE POLICY "Users can view own profile, team members, and assigned agents"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    ((select auth.uid()) = id) OR 
    ((select auth.uid()) = added_by) OR 
    (added_by = (select auth.uid())) OR 
    (EXISTS (
      SELECT 1
      FROM lines
      WHERE (lines.co_owner_id = (select auth.uid())) AND (lines.agent_id = users.id)
    ))
  );

-- ============================================================================
-- BORROWERS TABLE - Optimize Delete Policy
-- ============================================================================

-- Drop and recreate: Users can delete borrowers based on role and conditions
DROP POLICY IF EXISTS "Users can delete borrowers based on role and conditions" ON borrowers;

CREATE POLICY "Users can delete borrowers based on role and conditions"
  ON borrowers
  FOR DELETE
  TO authenticated
  USING (
    (line_id IN (
      SELECT lines.id
      FROM lines
      WHERE (lines.owner_id = (select auth.uid()))
    )) OR 
    (
      (line_id IN (
        SELECT lines.id
        FROM lines
        WHERE (lines.co_owner_id = (select auth.uid()))
      )) AND (active_loans = 0)
    ) OR 
    (
      (agent_id = (select auth.uid())) AND (active_loans = 0)
    )
  );

-- ============================================================================
-- EXPENSES TABLE - Optimize Select Policy
-- ============================================================================

-- Drop and recreate: Users can view expenses based on role and line assignment
DROP POLICY IF EXISTS "Users can view expenses based on role and line assignment" ON expenses;

CREATE POLICY "Users can view expenses based on role and line assignment"
  ON expenses
  FOR SELECT
  TO authenticated
  USING (
    (submitted_by = (select auth.uid())) OR 
    (EXISTS (
      SELECT 1
      FROM users requesting_user
      WHERE (requesting_user.id = (select auth.uid())) 
        AND (requesting_user.role = 'owner') 
        AND (EXISTS (
          SELECT 1
          FROM users expense_agent
          WHERE (expense_agent.id = expenses.submitted_by) 
            AND (expense_agent.added_by = (select auth.uid())) 
            AND (expense_agent.role = 'agent')
        ))
    )) OR 
    (EXISTS (
      SELECT 1
      FROM users requesting_user
      WHERE (requesting_user.id = (select auth.uid())) 
        AND (requesting_user.role = 'owner') 
        AND (EXISTS (
          SELECT 1
          FROM users expense_adder
          WHERE (expense_adder.id = expenses.added_by) 
            AND (expense_adder.added_by = (select auth.uid())) 
            AND (expense_adder.role = 'co-owner')
        ))
    )) OR 
    (EXISTS (
      SELECT 1
      FROM users requesting_user
      WHERE (requesting_user.id = (select auth.uid())) 
        AND (requesting_user.role = 'co-owner') 
        AND (EXISTS (
          SELECT 1
          FROM lines
          WHERE (lines.co_owner_id = (select auth.uid())) 
            AND (lines.agent_id = expenses.submitted_by)
        ))
    )) OR 
    (EXISTS (
      SELECT 1
      FROM users requesting_user
      WHERE (requesting_user.id = (select auth.uid())) 
        AND (requesting_user.role = 'co-owner') 
        AND (expenses.added_by = (select auth.uid()))
    ))
  );

-- ============================================================================
-- BORROWER_DELETION_REQUESTS TABLE - Optimize Policies
-- ============================================================================

-- Drop and recreate: Agents and co-owners can create deletion requests
DROP POLICY IF EXISTS "Agents and co-owners can create deletion requests" ON borrower_deletion_requests;

CREATE POLICY "Agents and co-owners can create deletion requests"
  ON borrower_deletion_requests
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = requester_id);

-- Drop and recreate: Owners can update deletion request status
DROP POLICY IF EXISTS "Owners can update deletion request status" ON borrower_deletion_requests;

CREATE POLICY "Owners can update deletion request status"
  ON borrower_deletion_requests
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = owner_id)
  WITH CHECK ((select auth.uid()) = owner_id);

-- Drop and recreate: Users can view deletion requests they created or need to handle
DROP POLICY IF EXISTS "Users can view deletion requests they created or need to handle" ON borrower_deletion_requests;

CREATE POLICY "Users can view deletion requests they created or need to handle"
  ON borrower_deletion_requests
  FOR SELECT
  TO authenticated
  USING (
    ((select auth.uid()) = requester_id) OR 
    ((select auth.uid()) = owner_id)
  );
