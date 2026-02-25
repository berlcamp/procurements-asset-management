-- APP approval table: tracks when HOPE approves the entire APP for a fiscal year
SET search_path TO assets, public;

CREATE TABLE IF NOT EXISTS assets.app (
  fiscal_year SMALLINT PRIMARY KEY,
  approved_at TIMESTAMPTZ,
  approved_by_user_id BIGINT REFERENCES assets.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE assets.app ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_select" ON assets.app FOR SELECT USING (true);
CREATE POLICY "app_insert" ON assets.app FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "app_update" ON assets.app FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE assets.app IS 'Tracks HOPE approval of the Annual Procurement Plan per fiscal year';
