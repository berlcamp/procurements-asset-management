-- Mode-driven procurement workflow: procurement_steps, config table, current_step_key
SET search_path TO assets, public;

-- ============================================================================
-- CURRENT STEP KEY on purchase_requests
-- ============================================================================
ALTER TABLE assets.purchase_requests ADD COLUMN IF NOT EXISTS current_step_key TEXT;

COMMENT ON COLUMN assets.purchase_requests.current_step_key IS 'The step currently active for this PR. Updated when advancing through workflow.';

-- ============================================================================
-- PROCUREMENT MODE WORKFLOWS (configuration - drives step generation)
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.procurement_mode_workflows (
  id SERIAL PRIMARY KEY,
  procurement_mode TEXT NOT NULL,
  step_key TEXT NOT NULL,
  step_name TEXT NOT NULL,
  sequence INT NOT NULL,
  UNIQUE (procurement_mode, step_key)
);

CREATE INDEX IF NOT EXISTS idx_procurement_mode_workflows_mode ON assets.procurement_mode_workflows(procurement_mode);

-- Seed all 6 mode workflows
INSERT INTO assets.procurement_mode_workflows (procurement_mode, step_key, step_name, sequence) VALUES
-- competitive_bidding
('competitive_bidding', 'pre_procurement', 'Pre-Procurement', 1),
('competitive_bidding', 'pre_procurement_conference', 'Pre-Procurement Conference', 2),
('competitive_bidding', 'advertisement_invitation', 'Advertisement / Invitation to Bid', 3),
('competitive_bidding', 'pre_bid_conference', 'Pre-Bid Conference', 4),
('competitive_bidding', 'bid_submission', 'Bid Submission', 5),
('competitive_bidding', 'bid_opening', 'Bid Opening', 6),
('competitive_bidding', 'bid_evaluation', 'Bid Evaluation', 7),
('competitive_bidding', 'post_qualification', 'Post Qualification', 8),
('competitive_bidding', 'notice_of_award', 'Notice of Award', 9),
('competitive_bidding', 'purchase_order', 'Purchase Order', 10),

-- small_value_procurement
('small_value_procurement', 'pre_procurement', 'Pre-Procurement', 1),
('small_value_procurement', 'rfq_preparation', 'RFQ Preparation', 2),
('small_value_procurement', 'supplier_quotations', 'Supplier Quotations', 3),
('small_value_procurement', 'abstract_of_quotations', 'Abstract of Quotations', 4),
('small_value_procurement', 'evaluation', 'Evaluation', 5),
('small_value_procurement', 'notice_of_award', 'Notice of Award', 6),
('small_value_procurement', 'purchase_order', 'Purchase Order', 7),

-- negotiated_procurement
('negotiated_procurement', 'pre_procurement', 'Pre-Procurement', 1),
('negotiated_procurement', 'negotiation', 'Negotiation with supplier(s)', 2),
('negotiated_procurement', 'proposal_submission', 'Proposal / Quotation submission', 3),
('negotiated_procurement', 'evaluation', 'Evaluation', 4),
('negotiated_procurement', 'notice_of_award', 'Notice of Award', 5),
('negotiated_procurement', 'purchase_order', 'Purchase Order', 6),

-- direct_contracting
('direct_contracting', 'pre_procurement', 'Pre-Procurement', 1),
('direct_contracting', 'request_proposal', 'Request proposal from exclusive supplier', 2),
('direct_contracting', 'technical_evaluation', 'Technical evaluation', 3),
('direct_contracting', 'notice_of_award', 'Notice of Award', 4),
('direct_contracting', 'purchase_order', 'Purchase Order', 5),

-- repeat_order
('repeat_order', 'pre_procurement', 'Pre-Procurement', 1),
('repeat_order', 'verify_previous_contract', 'Verify previous contract', 2),
('repeat_order', 'bac_recommendation', 'BAC recommendation', 3),
('repeat_order', 'notice_of_award', 'Notice of Award', 4),
('repeat_order', 'purchase_order', 'Purchase Order', 5),

-- agency_to_agency
('agency_to_agency', 'pre_procurement', 'Pre-Procurement', 1),
('agency_to_agency', 'coordination', 'Coordination with government agency', 2),
('agency_to_agency', 'memorandum_of_agreement', 'Memorandum of Agreement', 3),
('agency_to_agency', 'notice_of_award_agreement', 'Notice of Award / Agreement', 4),
('agency_to_agency', 'purchase_order', 'Purchase Order', 5)
ON CONFLICT (procurement_mode, step_key) DO NOTHING;

-- ============================================================================
-- PROCUREMENT STEPS (instance table - one row per PR step)
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.procurement_steps (
  id BIGSERIAL PRIMARY KEY,
  purchase_request_id BIGINT NOT NULL REFERENCES assets.purchase_requests(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  assigned_to BIGINT REFERENCES assets.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  sequence INT NOT NULL,
  notes TEXT,
  UNIQUE (purchase_request_id, step_key)
);

CREATE INDEX IF NOT EXISTS idx_procurement_steps_pr_id ON assets.procurement_steps(purchase_request_id);
CREATE INDEX IF NOT EXISTS idx_procurement_steps_pr_sequence ON assets.procurement_steps(purchase_request_id, sequence);
CREATE INDEX IF NOT EXISTS idx_procurement_steps_step_status ON assets.procurement_steps(step_key, status);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE assets.procurement_mode_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "procurement_mode_workflows_select" ON assets.procurement_mode_workflows FOR SELECT USING (true);

ALTER TABLE assets.procurement_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "procurement_steps_select" ON assets.procurement_steps FOR SELECT USING (true);
CREATE POLICY "procurement_steps_insert" ON assets.procurement_steps FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "procurement_steps_update" ON assets.procurement_steps FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "procurement_steps_delete" ON assets.procurement_steps FOR DELETE TO authenticated USING (true);

COMMENT ON TABLE assets.procurement_mode_workflows IS 'Config: which steps apply to each procurement mode. Drives generateSteps().';
COMMENT ON TABLE assets.procurement_steps IS 'Instance: workflow steps per purchase request. Auditable, mode-driven.';
