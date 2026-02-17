/*
  # Add Missing Foreign Key Indexes
  
  1. Problem
    - Many foreign key columns lack covering indexes
    - This causes suboptimal query performance when joining tables
    - Database has to do sequential scans instead of index lookups
    
  2. Solution
    - Add indexes to all foreign key columns that don't have them
    - This will dramatically improve JOIN performance and query speed
    
  3. Changes
    - Add indexes to foreign keys in:
      - agent_locations
      - borrowers
      - co_owner_agent_sessions
      - commissions
      - daily_accounts
      - daily_reports
      - expenses
      - lines
      - loans
      - missed_payments
      - notifications
      - offline_queue
      - payment_methods
      - payments
      - penalties
      - qr_payments
      - withdrawals
    
  4. Performance Impact
    - These indexes will speed up all queries that JOIN on these foreign keys
    - Minimal write overhead (indexes are updated automatically)
    - Significant read performance improvement
*/

-- ============================================================================
-- AGENT_LOCATIONS TABLE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_agent_locations_user_id ON agent_locations(user_id);

-- ============================================================================
-- BORROWERS TABLE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_borrowers_agent_id ON borrowers(agent_id);

-- ============================================================================
-- CO_OWNER_AGENT_SESSIONS TABLE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_co_owner_agent_sessions_co_owner_id ON co_owner_agent_sessions(co_owner_id);
CREATE INDEX IF NOT EXISTS idx_co_owner_agent_sessions_line_id ON co_owner_agent_sessions(line_id);

-- ============================================================================
-- COMMISSIONS TABLE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_commissions_agent_id ON commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_commissions_line_id ON commissions(line_id);

-- ============================================================================
-- DAILY_ACCOUNTS TABLE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_daily_accounts_created_by ON daily_accounts(created_by);
CREATE INDEX IF NOT EXISTS idx_daily_accounts_locked_by ON daily_accounts(locked_by);

-- ============================================================================
-- DAILY_REPORTS TABLE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_daily_reports_generated_by ON daily_reports(generated_by);
CREATE INDEX IF NOT EXISTS idx_daily_reports_line_id ON daily_reports(line_id);

-- ============================================================================
-- EXPENSES TABLE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_expenses_added_by ON expenses(added_by);
CREATE INDEX IF NOT EXISTS idx_expenses_approved_by ON expenses(approved_by);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_line_id ON expenses(line_id);
CREATE INDEX IF NOT EXISTS idx_expenses_submitted_by ON expenses(submitted_by);

-- ============================================================================
-- LINES TABLE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_lines_agent_id ON lines(agent_id);
CREATE INDEX IF NOT EXISTS idx_lines_co_owner_id ON lines(co_owner_id);
CREATE INDEX IF NOT EXISTS idx_lines_owner_id ON lines(owner_id);

-- ============================================================================
-- LOANS TABLE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_loans_borrower_id ON loans(borrower_id);
CREATE INDEX IF NOT EXISTS idx_loans_line_id ON loans(line_id);

-- ============================================================================
-- MISSED_PAYMENTS TABLE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_missed_payments_borrower_id ON missed_payments(borrower_id);
CREATE INDEX IF NOT EXISTS idx_missed_payments_loan_id ON missed_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_missed_payments_marked_by ON missed_payments(marked_by);
CREATE INDEX IF NOT EXISTS idx_missed_payments_payment_id ON missed_payments(payment_id);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- ============================================================================
-- OFFLINE_QUEUE TABLE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_offline_queue_user_id ON offline_queue(user_id);

-- ============================================================================
-- PAYMENT_METHODS TABLE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_payment_methods_line_id ON payment_methods(line_id);

-- ============================================================================
-- PAYMENTS TABLE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_payments_collected_by ON payments(collected_by);
CREATE INDEX IF NOT EXISTS idx_payments_loan_id ON payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_payments_penalty_id ON payments(penalty_id);

-- ============================================================================
-- PENALTIES TABLE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_penalties_applied_by ON penalties(applied_by);
CREATE INDEX IF NOT EXISTS idx_penalties_borrower_id ON penalties(borrower_id);
CREATE INDEX IF NOT EXISTS idx_penalties_line_id ON penalties(line_id);
CREATE INDEX IF NOT EXISTS idx_penalties_loan_id ON penalties(loan_id);
CREATE INDEX IF NOT EXISTS idx_penalties_payment_id ON penalties(payment_id);

-- ============================================================================
-- QR_PAYMENTS TABLE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_qr_payments_borrower_id ON qr_payments(borrower_id);
CREATE INDEX IF NOT EXISTS idx_qr_payments_loan_id ON qr_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_qr_payments_payment_method_id ON qr_payments(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_qr_payments_reconciled_by ON qr_payments(reconciled_by);

-- ============================================================================
-- WITHDRAWALS TABLE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_withdrawals_approved_by ON withdrawals(approved_by);
CREATE INDEX IF NOT EXISTS idx_withdrawals_line_id ON withdrawals(line_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_withdrawn_by ON withdrawals(withdrawn_by);
