-- Project Procurement Management Plan (PPMP) table
SET search_path TO assets, public;

-- ============================================================================
-- PPMP TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.ppmp (
  id BIGSERIAL PRIMARY KEY,
  fiscal_year SMALLINT NOT NULL,
  end_user_type TEXT NOT NULL CHECK (end_user_type IN ('school', 'office')),
  school_id BIGINT REFERENCES assets.schools(id) ON DELETE CASCADE,
  office_id BIGINT REFERENCES assets.offices(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ppmp_unit_check CHECK (
    (end_user_type = 'school' AND school_id IS NOT NULL AND office_id IS NULL) OR
    (end_user_type = 'office' AND office_id IS NOT NULL AND school_id IS NULL)
  )
);

-- Unique: one PPMP per fiscal year per school
CREATE UNIQUE INDEX idx_ppmp_unique_school
  ON assets.ppmp (fiscal_year, school_id) WHERE school_id IS NOT NULL;

-- Unique: one PPMP per fiscal year per office
CREATE UNIQUE INDEX idx_ppmp_unique_office
  ON assets.ppmp (fiscal_year, office_id) WHERE office_id IS NOT NULL;

-- Indexes for filters
CREATE INDEX IF NOT EXISTS idx_ppmp_fiscal_year ON assets.ppmp(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_ppmp_school_id ON assets.ppmp(school_id) WHERE school_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ppmp_office_id ON assets.ppmp(office_id) WHERE office_id IS NOT NULL;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE assets.ppmp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ppmp_select" ON assets.ppmp FOR SELECT USING (true);
CREATE POLICY "ppmp_insert" ON assets.ppmp FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ppmp_update" ON assets.ppmp FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ppmp_delete" ON assets.ppmp FOR DELETE TO authenticated USING (true);
