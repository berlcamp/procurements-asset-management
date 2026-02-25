-- Add created_by to ppmp - references the user (creator) who created the PPMP
SET search_path TO assets, public;

ALTER TABLE assets.ppmp
  ADD COLUMN IF NOT EXISTS created_by BIGINT REFERENCES assets.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ppmp_created_by ON assets.ppmp(created_by) WHERE created_by IS NOT NULL;
