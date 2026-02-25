-- Add account_type to users: 'school' | 'office'
-- school: supply officer - school, school staff
-- office: all other user types
SET search_path TO assets, public;

ALTER TABLE assets.users
  ADD COLUMN IF NOT EXISTS account_type TEXT CHECK (account_type IN ('school', 'office'));

-- Backfill: set account_type based on type
UPDATE assets.users
SET account_type = CASE
  WHEN type IN ('supply officer - school', 'school staff') THEN 'school'
  ELSE 'office'
END
WHERE account_type IS NULL;

-- Make account_type NOT NULL after backfill (allow NULL for now if any edge cases)
-- For new inserts, application will set it

CREATE INDEX IF NOT EXISTS idx_users_account_type ON assets.users(account_type);
