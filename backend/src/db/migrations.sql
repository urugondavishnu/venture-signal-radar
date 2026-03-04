-- ============================================
-- Supabase Database Migrations
-- Run these in the Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  company_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  domain TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  founding_year INTEGER,
  headquarters TEXT,
  company_size TEXT,
  detected_products TEXT[],
  careers_url TEXT,
  blog_url TEXT,
  pricing_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_agent_run TIMESTAMPTZ,
  tracking_status TEXT DEFAULT 'active' CHECK (tracking_status IN ('active', 'paused', 'archived'))
);

-- Signals table
CREATE TABLE IF NOT EXISTS signals (
  signal_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN (
    'product_launch', 'financing', 'leadership_change',
    'revenue_milestone', 'customer_win', 'pricing_update',
    'hiring_trend', 'partnership', 'general_news'
  )),
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  url TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  report_data JSONB NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_domain ON companies(domain);
CREATE INDEX IF NOT EXISTS idx_companies_tracking ON companies(tracking_status);
CREATE INDEX IF NOT EXISTS idx_signals_company_id ON signals(company_id);
CREATE INDEX IF NOT EXISTS idx_signals_type ON signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_signals_detected_at ON signals(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_company_id ON reports(company_id);
CREATE INDEX IF NOT EXISTS idx_reports_generated_at ON reports(generated_at DESC);
