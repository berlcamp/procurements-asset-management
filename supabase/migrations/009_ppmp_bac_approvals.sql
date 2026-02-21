-- Track BAC member approvals for PPMPs (audit trail)
SET search_path TO assets, public;

CREATE TABLE IF NOT EXISTS assets.ppmp_bac_approvals (
  id BIGSERIAL PRIMARY KEY,
  ppmp_id BIGINT NOT NULL REFERENCES assets.ppmp(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES assets.users(id) ON DELETE CASCADE,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ppmp_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ppmp_bac_approvals_ppmp_id ON assets.ppmp_bac_approvals(ppmp_id);

-- RLS
ALTER TABLE assets.ppmp_bac_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ppmp_bac_approvals_select" ON assets.ppmp_bac_approvals FOR SELECT USING (true);
CREATE POLICY "ppmp_bac_approvals_insert" ON assets.ppmp_bac_approvals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ppmp_bac_approvals_delete" ON assets.ppmp_bac_approvals FOR DELETE TO authenticated USING (true);

COMMENT ON TABLE assets.ppmp_bac_approvals IS 'Audit trail of which BAC members approved each PPMP';
