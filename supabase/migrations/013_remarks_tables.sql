-- Separate tables for multiple remarks on PPMP and ppmp_rows
SET search_path TO assets, public;

-- ============================================================================
-- PPMP REMARKS - multiple remarks per PPMP (for ppmp-submissions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.ppmp_remarks (
  id BIGSERIAL PRIMARY KEY,
  ppmp_id BIGINT NOT NULL REFERENCES assets.ppmp(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  role TEXT,
  created_by BIGINT REFERENCES assets.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppmp_remarks_ppmp_id ON assets.ppmp_remarks(ppmp_id);

ALTER TABLE assets.ppmp_remarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ppmp_remarks_select" ON assets.ppmp_remarks FOR SELECT USING (true);
CREATE POLICY "ppmp_remarks_insert" ON assets.ppmp_remarks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ppmp_remarks_update" ON assets.ppmp_remarks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ppmp_remarks_delete" ON assets.ppmp_remarks FOR DELETE TO authenticated USING (true);

COMMENT ON TABLE assets.ppmp_remarks IS 'Multiple remarks per PPMP (unit head, budget, BAC, HOPE feedback)';

-- ============================================================================
-- PPMP ROW REMARKS - multiple remarks per ppmp_row (for APP page)
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.ppmp_row_remarks (
  id BIGSERIAL PRIMARY KEY,
  ppmp_row_id BIGINT NOT NULL REFERENCES assets.ppmp_rows(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  role TEXT,
  created_by BIGINT REFERENCES assets.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppmp_row_remarks_ppmp_row_id ON assets.ppmp_row_remarks(ppmp_row_id);

ALTER TABLE assets.ppmp_row_remarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ppmp_row_remarks_select" ON assets.ppmp_row_remarks FOR SELECT USING (true);
CREATE POLICY "ppmp_row_remarks_insert" ON assets.ppmp_row_remarks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ppmp_row_remarks_update" ON assets.ppmp_row_remarks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ppmp_row_remarks_delete" ON assets.ppmp_row_remarks FOR DELETE TO authenticated USING (true);

COMMENT ON TABLE assets.ppmp_row_remarks IS 'Multiple remarks per APP row (BAC feedback)';
