-- Add school_id, office_id, designation to users
SET search_path TO assets, public;

ALTER TABLE assets.users
  ADD COLUMN IF NOT EXISTS school_id BIGINT REFERENCES assets.schools(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS office_id BIGINT REFERENCES assets.offices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS designation TEXT;

CREATE INDEX IF NOT EXISTS idx_users_school_id ON assets.users(school_id);
CREATE INDEX IF NOT EXISTS idx_users_office_id ON assets.users(office_id);
