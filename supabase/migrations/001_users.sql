-- Create assets schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS assets;

-- Set the schema to assets
SET search_path TO assets, public;

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  type TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON assets.users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON assets.users(is_active) WHERE is_active = true;