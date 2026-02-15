/*
  # Fix Co-Owner Visibility of Assigned Agents

  1. Changes
    - Update users SELECT policy to allow co-owners to see agents assigned to lines they co-own
    - Co-owners can now view agents that are assigned to any line where they are the co-owner
    - Maintains all existing access patterns (own profile, added users, etc.)
    
  2. Security
    - Co-owners can only see agents who are assigned to lines they co-own
    - Owners continue to see all users they added
    - Users can always see their own profile
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view own profile and team members" ON users;

-- Create updated policy that allows co-owners to see agents assigned to their lines
CREATE POLICY "Users can view own profile, team members, and assigned agents"
  ON users FOR SELECT
  TO authenticated
  USING (
    -- Users can see their own profile
    auth.uid() = id 
    OR
    -- Users can see who added them
    auth.uid() = added_by 
    OR
    -- Users can see users they added
    added_by = auth.uid()
    OR
    -- Co-owners can see agents assigned to lines they co-own
    (
      EXISTS (
        SELECT 1 FROM lines
        WHERE lines.co_owner_id = auth.uid()
        AND lines.agent_id = users.id
      )
    )
  );
