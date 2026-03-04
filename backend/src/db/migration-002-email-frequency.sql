-- Add email_frequency column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_frequency TEXT DEFAULT 'daily'
  CHECK (email_frequency IN ('daily', 'every_3_days', 'weekly', 'monthly', 'only_on_run'));
