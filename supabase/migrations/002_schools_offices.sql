-- Schools and Offices tables
SET search_path TO assets, public;

-- ============================================================================
-- SCHOOLS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.schools (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  head_user_id BIGINT REFERENCES assets.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schools_head_user_id ON assets.schools(head_user_id);

-- ============================================================================
-- OFFICES TABLE (Division Offices)
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.offices (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  head_user_id BIGINT REFERENCES assets.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offices_head_user_id ON assets.offices(head_user_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Schools
ALTER TABLE assets.schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schools_select_public" ON assets.schools
  FOR SELECT USING (true);
CREATE POLICY "schools_insert_authenticated" ON assets.schools
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "schools_update_authenticated" ON assets.schools
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "schools_delete_authenticated" ON assets.schools
  FOR DELETE TO authenticated USING (true);

-- Offices
ALTER TABLE assets.offices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offices_select_public" ON assets.offices
  FOR SELECT USING (true);
CREATE POLICY "offices_insert_authenticated" ON assets.offices
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "offices_update_authenticated" ON assets.offices
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "offices_delete_authenticated" ON assets.offices
  FOR DELETE TO authenticated USING (true);
