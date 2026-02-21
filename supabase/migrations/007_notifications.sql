-- Notifications table for in-app notifications
SET search_path TO assets, public;

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES assets.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON assets.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON assets.notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON assets.notifications(created_at DESC);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE assets.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "notifications_select_own"
  ON assets.notifications FOR SELECT
  TO authenticated
  USING (user_id IN (
    SELECT id FROM assets.users WHERE email = auth.jwt()->>'email'
  ));

-- Users can update their own (e.g. mark as read)
CREATE POLICY "notifications_update_own"
  ON assets.notifications FOR UPDATE
  TO authenticated
  USING (user_id IN (
    SELECT id FROM assets.users WHERE email = auth.jwt()->>'email'
  ))
  WITH CHECK (true);

-- Insert: allow authenticated - notifications are created by system / other users for the recipient
CREATE POLICY "notifications_insert_authenticated"
  ON assets.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);
