-- ============================================
-- Migration 004: Supabase Auth + Row Level Security
-- Run this in the Supabase SQL Editor
-- ============================================

-- 1. Add user_id column to reports (references auth.users directly)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS user_id UUID;

-- 2. Backfill reports user_id from their parent company
UPDATE reports r
SET user_id = c.user_id
FROM companies c
WHERE r.company_id = c.company_id
AND r.user_id IS NULL;

-- 3. Add index for report user_id
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);

-- 4. Update the users table to use auth.users id
-- The users table user_id should match Supabase Auth user UUID.
-- New users will be created with their auth.users.id as user_id.

-- 5. Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 7. RLS Policies for companies table
CREATE POLICY "Users can view own companies"
  ON companies FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own companies"
  ON companies FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own companies"
  ON companies FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own companies"
  ON companies FOR DELETE
  USING (user_id = auth.uid());

-- 8. RLS Policies for signals table (via company ownership)
CREATE POLICY "Users can view signals for own companies"
  ON signals FOR SELECT
  USING (company_id IN (SELECT company_id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert signals for own companies"
  ON signals FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete signals for own companies"
  ON signals FOR DELETE
  USING (company_id IN (SELECT company_id FROM companies WHERE user_id = auth.uid()));

-- 9. RLS Policies for reports table
CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own reports"
  ON reports FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own reports"
  ON reports FOR DELETE
  USING (user_id = auth.uid());

-- 10. Allow service role to bypass RLS (for backend operations with service key)
-- The service key already bypasses RLS by default in Supabase.
-- No additional config needed.
