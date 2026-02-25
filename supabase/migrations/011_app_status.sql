-- Add app_status column to ppmp_rows for BAC per-row approval on APP
SET search_path TO assets, public;

ALTER TABLE assets.ppmp_rows
  ADD COLUMN IF NOT EXISTS app_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (app_status IN ('pending', 'approved'));

CREATE INDEX IF NOT EXISTS idx_ppmp_rows_app_status ON assets.ppmp_rows(app_status);

COMMENT ON COLUMN assets.ppmp_rows.app_status IS 'BAC approval status for APP: pending until BAC approves each row';
