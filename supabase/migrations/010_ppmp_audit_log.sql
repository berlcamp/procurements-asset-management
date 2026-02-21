-- PPMP audit trail: log every action (submission, return, approval)
SET search_path TO assets, public;

CREATE TABLE IF NOT EXISTS assets.ppmp_audit_log (
  id BIGSERIAL PRIMARY KEY,
  ppmp_id BIGINT NOT NULL REFERENCES assets.ppmp(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES assets.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppmp_audit_log_ppmp_id ON assets.ppmp_audit_log(ppmp_id);
CREATE INDEX IF NOT EXISTS idx_ppmp_audit_log_created_at ON assets.ppmp_audit_log(created_at DESC);

-- RLS
ALTER TABLE assets.ppmp_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ppmp_audit_log_select" ON assets.ppmp_audit_log FOR SELECT USING (true);
CREATE POLICY "ppmp_audit_log_insert" ON assets.ppmp_audit_log FOR INSERT TO authenticated WITH CHECK (true);

COMMENT ON TABLE assets.ppmp_audit_log IS 'Audit trail of all PPMP actions: submissions, returns, approvals';
