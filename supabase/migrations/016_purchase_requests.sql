-- Purchase Requests (PR) - created from approved PPMP rows
SET search_path TO assets, public;

-- ============================================================================
-- PURCHASE REQUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.purchase_requests (
  id BIGSERIAL PRIMARY KEY,
  ppmp_row_id BIGINT NOT NULL REFERENCES assets.ppmp_rows(id) ON DELETE CASCADE,
  created_by BIGINT NOT NULL REFERENCES assets.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  reference_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_requests_ppmp_row ON assets.purchase_requests(ppmp_row_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_created_by ON assets.purchase_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON assets.purchase_requests(status);

-- ============================================================================
-- PURCHASE REQUEST ITEMS TABLE (links PR to lot/item by index)
-- ============================================================================
CREATE TABLE IF NOT EXISTS assets.purchase_request_items (
  id BIGSERIAL PRIMARY KEY,
  purchase_request_id BIGINT NOT NULL REFERENCES assets.purchase_requests(id) ON DELETE CASCADE,
  ppmp_row_id BIGINT NOT NULL REFERENCES assets.ppmp_rows(id) ON DELETE CASCADE,
  lot_index INT NOT NULL,
  item_index INT NOT NULL,
  description TEXT,
  quantity DECIMAL(15, 4),
  unit TEXT,
  estimated_cost DECIMAL(15, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_request_items_pr ON assets.purchase_request_items(purchase_request_id);
CREATE INDEX IF NOT EXISTS idx_purchase_request_items_ppmp_row ON assets.purchase_request_items(ppmp_row_id);
-- Each lot/item can only be in one PR (enforced at DB level)
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_request_items_lot_item_unique ON assets.purchase_request_items(ppmp_row_id, lot_index, item_index);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE assets.purchase_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchase_requests_select" ON assets.purchase_requests FOR SELECT USING (true);
CREATE POLICY "purchase_requests_insert" ON assets.purchase_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "purchase_requests_update" ON assets.purchase_requests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "purchase_requests_delete" ON assets.purchase_requests FOR DELETE TO authenticated USING (true);

ALTER TABLE assets.purchase_request_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchase_request_items_select" ON assets.purchase_request_items FOR SELECT USING (true);
CREATE POLICY "purchase_request_items_insert" ON assets.purchase_request_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "purchase_request_items_update" ON assets.purchase_request_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "purchase_request_items_delete" ON assets.purchase_request_items FOR DELETE TO authenticated USING (true);

COMMENT ON TABLE assets.purchase_requests IS 'Purchase Requests created from approved PPMP rows';
COMMENT ON TABLE assets.purchase_request_items IS 'Links PR items to PPMP row lots/items via lot_index and item_index';
