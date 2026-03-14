/** Row from procurement_mode_workflows (select) */
export interface ProcurementModeWorkflowRow {
  step_key: string;
  step_name: string;
  sequence: number;
}

/** Row from procurement_steps */
export interface ProcurementStepRow {
  id: number;
  purchase_request_id: number;
  step_key: string;
  step_name: string;
  status: "pending" | "in_progress" | "completed" | "skipped";
  assigned_to: number | null;
  completed_at: string | null;
  sequence: number;
  notes: string | null;
}
