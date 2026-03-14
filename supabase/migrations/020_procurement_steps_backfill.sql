-- Backfill: generate procurement_steps for existing PRs in workflow
SET search_path TO assets, public;

DO $$
DECLARE
  pr_rec RECORD;
  mode_key TEXT;
  step_rec RECORD;
  target_step_key TEXT;
  target_seq INT;
  steps_exist BOOLEAN;
BEGIN
  FOR pr_rec IN
    SELECT pr.id AS pr_id, pr.status, pr.ppmp_row_id, COALESCE(r.procurement_mode, 'competitive bidding') AS procurement_mode
    FROM assets.purchase_requests pr
    JOIN assets.ppmp_rows r ON r.id = pr.ppmp_row_id
    WHERE pr.status IN ('for_procurement', 'ready_for_rfq_bidding', 'for_bid_evaluation', 'for_notice_of_award', 'for_purchase_order', 'po_released')
    AND NOT EXISTS (SELECT 1 FROM assets.procurement_steps ps WHERE ps.purchase_request_id = pr.id)
  LOOP
    mode_key := lower(replace(trim(pr_rec.procurement_mode), ' ', '_'));
    IF mode_key = '' OR mode_key = 'others' OR mode_key NOT IN ('competitive_bidding', 'negotiated_procurement', 'small_value_procurement', 'direct_contracting', 'repeat_order', 'agency_to_agency') THEN
      mode_key := 'competitive_bidding';
    END IF;

    target_step_key := CASE pr_rec.status
      WHEN 'for_procurement' THEN 'pre_procurement'
      WHEN 'ready_for_rfq_bidding' THEN (SELECT step_key FROM assets.procurement_mode_workflows WHERE procurement_mode = mode_key ORDER BY sequence OFFSET 1 LIMIT 1)
      WHEN 'for_bid_evaluation' THEN (SELECT step_key FROM assets.procurement_mode_workflows WHERE procurement_mode = mode_key AND step_key IN ('bid_evaluation', 'evaluation', 'abstract_of_quotations', 'technical_evaluation', 'bac_recommendation') ORDER BY sequence LIMIT 1)
      WHEN 'for_notice_of_award' THEN (SELECT step_key FROM assets.procurement_mode_workflows WHERE procurement_mode = mode_key AND step_key IN ('notice_of_award', 'notice_of_award_agreement') ORDER BY sequence LIMIT 1)
      WHEN 'for_purchase_order' THEN 'purchase_order'
      ELSE NULL
    END;

    INSERT INTO assets.procurement_steps (purchase_request_id, step_key, step_name, status, sequence)
    SELECT pr_rec.pr_id, step_key, step_name, 'pending', sequence
    FROM assets.procurement_mode_workflows
    WHERE procurement_mode = mode_key
    ORDER BY sequence;

    IF pr_rec.status = 'po_released' THEN
      UPDATE assets.procurement_steps SET status = 'completed', completed_at = NOW() WHERE purchase_request_id = pr_rec.pr_id;
      UPDATE assets.purchase_requests SET current_step_key = NULL, updated_at = NOW() WHERE id = pr_rec.pr_id;
    ELSIF target_step_key IS NOT NULL THEN
      target_seq := (SELECT sequence FROM assets.procurement_mode_workflows WHERE procurement_mode = mode_key AND step_key = target_step_key LIMIT 1);
      UPDATE assets.procurement_steps SET status = 'completed', completed_at = NOW() WHERE purchase_request_id = pr_rec.pr_id AND sequence < target_seq;
      UPDATE assets.procurement_steps SET status = 'in_progress' WHERE purchase_request_id = pr_rec.pr_id AND step_key = target_step_key;
      UPDATE assets.purchase_requests SET current_step_key = target_step_key, updated_at = NOW() WHERE id = pr_rec.pr_id;
    ELSE
      UPDATE assets.procurement_steps SET status = 'in_progress' WHERE purchase_request_id = pr_rec.pr_id AND sequence = 1;
      UPDATE assets.purchase_requests SET current_step_key = (SELECT step_key FROM assets.procurement_steps WHERE purchase_request_id = pr_rec.pr_id AND sequence = 1), updated_at = NOW() WHERE id = pr_rec.pr_id;
    END IF;
  END LOOP;
END $$;
