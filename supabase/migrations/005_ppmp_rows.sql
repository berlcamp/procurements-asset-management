-- PPMP Rows (procurement project entries)
SET search_path TO assets, public;

-- ============================================================================
-- PPMP ROWS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.ppmp_rows (
  id BIGSERIAL PRIMARY KEY,
  ppmp_id BIGINT NOT NULL REFERENCES assets.ppmp(id) ON DELETE CASCADE,
  -- Step 1: General info
  general_description TEXT,
  project_type TEXT CHECK (project_type IN ('goods', 'infrastructure', 'consulting_services')),
  -- Step 2: Items to be procured (lots and items - editable later)
  items JSONB NOT NULL DEFAULT '[]',
  -- Step 3: Procurement details
  procurement_mode TEXT,
  pre_procurement_conference BOOLEAN NOT NULL DEFAULT false,
  procurement_start_date DATE,
  procurement_end_date DATE,
  delivery_period DATE,
  -- Step 4: Budget
  source_of_funds TEXT,
  estimated_budget DECIMAL(15, 2),
  -- Step 5: Attachments (array of { name, url })
  attachments JSONB NOT NULL DEFAULT '[]',
  -- Step 6: Remarks (array of strings)
  remarks JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppmp_rows_ppmp_id ON assets.ppmp_rows(ppmp_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE assets.ppmp_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ppmp_rows_select" ON assets.ppmp_rows FOR SELECT USING (true);
CREATE POLICY "ppmp_rows_insert" ON assets.ppmp_rows FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ppmp_rows_update" ON assets.ppmp_rows FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ppmp_rows_delete" ON assets.ppmp_rows FOR DELETE TO authenticated USING (true);
