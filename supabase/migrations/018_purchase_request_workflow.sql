-- Purchase Request workflow: extend status and add approval/certification columns
SET search_path TO assets, public;

-- ============================================================================
-- DROP OLD STATUS CHECK
-- ============================================================================
ALTER TABLE assets.purchase_requests DROP CONSTRAINT IF EXISTS purchase_requests_status_check;

-- ============================================================================
-- ADD NEW STATUS CHECK (expanded values)
-- ============================================================================
ALTER TABLE assets.purchase_requests ADD CONSTRAINT purchase_requests_status_check CHECK (
  status IN (
    'draft',
    'submitted',
    'funds_certified',
    'hope_approved',
    'for_procurement',
    'ready_for_rfq_bidding',
    'for_bid_evaluation',
    'for_notice_of_award',
    'for_purchase_order',
    'po_released'
  )
);

-- ============================================================================
-- FUND CERTIFICATION (Budget Officer)
-- ============================================================================
ALTER TABLE assets.purchase_requests ADD COLUMN IF NOT EXISTS funds_certified_by BIGINT REFERENCES assets.users(id) ON DELETE SET NULL;
ALTER TABLE assets.purchase_requests ADD COLUMN IF NOT EXISTS funds_certified_date TIMESTAMPTZ;

-- ============================================================================
-- HOPE APPROVAL
-- ============================================================================
ALTER TABLE assets.purchase_requests ADD COLUMN IF NOT EXISTS hope_approved_by BIGINT REFERENCES assets.users(id) ON DELETE SET NULL;
ALTER TABLE assets.purchase_requests ADD COLUMN IF NOT EXISTS hope_approved_date TIMESTAMPTZ;

-- ============================================================================
-- FOR PROCUREMENT (BAC Secretariat)
-- ============================================================================
ALTER TABLE assets.purchase_requests ADD COLUMN IF NOT EXISTS for_procurement_by BIGINT REFERENCES assets.users(id) ON DELETE SET NULL;
ALTER TABLE assets.purchase_requests ADD COLUMN IF NOT EXISTS for_procurement_date TIMESTAMPTZ;

-- ============================================================================
-- PRE-PROCUREMENT
-- ============================================================================
ALTER TABLE assets.purchase_requests ADD COLUMN IF NOT EXISTS conference_date DATE;

-- ============================================================================
-- RFQ / BIDDING
-- ============================================================================
ALTER TABLE assets.purchase_requests ADD COLUMN IF NOT EXISTS rfq_no TEXT;
ALTER TABLE assets.purchase_requests ADD COLUMN IF NOT EXISTS posting_date DATE;
ALTER TABLE assets.purchase_requests ADD COLUMN IF NOT EXISTS submission_deadline DATE;

-- ============================================================================
-- BID EVALUATION
-- ============================================================================
ALTER TABLE assets.purchase_requests ADD COLUMN IF NOT EXISTS num_bidders INT;
ALTER TABLE assets.purchase_requests ADD COLUMN IF NOT EXISTS lowest_bid DECIMAL(15, 2);
ALTER TABLE assets.purchase_requests ADD COLUMN IF NOT EXISTS evaluation_status TEXT;

-- ============================================================================
-- NOTICE OF AWARD
-- ============================================================================
ALTER TABLE assets.purchase_requests ADD COLUMN IF NOT EXISTS supplier TEXT;
ALTER TABLE assets.purchase_requests ADD COLUMN IF NOT EXISTS award_amount DECIMAL(15, 2);
ALTER TABLE assets.purchase_requests ADD COLUMN IF NOT EXISTS noa_date DATE;

-- ============================================================================
-- PURCHASE ORDER
-- ============================================================================
ALTER TABLE assets.purchase_requests ADD COLUMN IF NOT EXISTS delivery_date DATE;

COMMENT ON COLUMN assets.purchase_requests.funds_certified_by IS 'User ID of Budget Officer who certified funds';
COMMENT ON COLUMN assets.purchase_requests.funds_certified_date IS 'When funds were certified';
COMMENT ON COLUMN assets.purchase_requests.hope_approved_by IS 'User ID of HoPE (Schools Division Superintendent) who approved';
COMMENT ON COLUMN assets.purchase_requests.conference_date IS 'Pre-procurement conference date';
COMMENT ON COLUMN assets.purchase_requests.rfq_no IS 'Request for Quotation number';
COMMENT ON COLUMN assets.purchase_requests.supplier IS 'Winning supplier name';
