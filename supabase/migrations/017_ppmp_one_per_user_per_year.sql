-- Enforce: each user can only create 1 PPMP per fiscal year
SET search_path TO assets, public;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ppmp_unique_creator_per_year
  ON assets.ppmp (fiscal_year, created_by) WHERE created_by IS NOT NULL;

COMMENT ON INDEX assets.idx_ppmp_unique_creator_per_year IS 'One PPMP per user per fiscal year';
