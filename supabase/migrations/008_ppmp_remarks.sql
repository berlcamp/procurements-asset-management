-- Add PPMP-level remarks for reviewer feedback (e.g. unit head return, BAC comments)
SET search_path TO assets, public;

ALTER TABLE assets.ppmp
  ADD COLUMN IF NOT EXISTS remarks JSONB NOT NULL DEFAULT '[]';

COMMENT ON COLUMN assets.ppmp.remarks IS 'Array of { text, role?, created_at } for reviewer remarks';
