/*
  # Fix Function Search Path Security Issue
  
  1. Problem
    - Function validate_borrower_phone_not_user has a mutable search_path
    - This is a security risk as it allows search_path manipulation
    - Mutable search paths can lead to privilege escalation vulnerabilities
    
  2. Solution
    - Set the search_path explicitly to a secure, immutable value
    - Use SECURITY INVOKER instead of SECURITY DEFINER if possible
    - Or keep SECURITY DEFINER but set explicit search_path
    
  3. Changes
    - Recreate the function with explicit SET search_path
    - This prevents the search path from being changed at runtime
    
  4. Security Impact
    - Prevents potential privilege escalation attacks
    - Function behavior becomes more predictable and secure
*/

-- ============================================================================
-- RECREATE FUNCTION WITH SECURE SEARCH PATH
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_borrower_phone_not_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;

/*
  EXPLANATION:
  - SET search_path = public, pg_temp ensures the function always looks in the public schema
  - pg_temp is included to allow temporary objects
  - This prevents malicious users from manipulating the search path
  - SECURITY DEFINER is needed to check the users table with elevated privileges
*/
