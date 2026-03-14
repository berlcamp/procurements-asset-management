import { BID_EVALUATION_STEP_KEYS } from "@/lib/constants";
import { supabase } from "@/lib/supabase/client";
import type { ProcurementModeWorkflowRow } from "./types";

/** Normalize display string to mode key: "competitive bidding" → "competitive_bidding" */
export function normalizeProcurementMode(display: string | null | undefined): string {
  if (!display || typeof display !== "string") return "competitive_bidding";
  const key = display
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (key === "" || key === "others") return "competitive_bidding";
  const validModes = [
    "competitive_bidding",
    "negotiated_procurement",
    "small_value_procurement",
    "direct_contracting",
    "repeat_order",
    "agency_to_agency",
  ];
  return validModes.includes(key) ? key : "competitive_bidding";
}

/**
 * Generate procurement_steps for a PR based on procurement_mode.
 * Call after PR insert. Does not set current_step_key (that happens when PR reaches for_procurement).
 */
export async function generateSteps(
  purchaseRequestId: number,
  procurementMode: string | null | undefined,
): Promise<void> {
  const modeKey = normalizeProcurementMode(procurementMode);

  const { data: workflowRows, error: fetchError } = await supabase
    .from("procurement_mode_workflows")
    .select("step_key, step_name, sequence")
    .eq("procurement_mode", modeKey)
    .order("sequence", { ascending: true });

  if (fetchError) {
    throw new Error(`Failed to fetch workflow config: ${fetchError.message}`);
  }
  if (!workflowRows || workflowRows.length === 0) {
    throw new Error(`No workflow config for mode: ${modeKey}`);
  }

  const stepsToInsert = (workflowRows as ProcurementModeWorkflowRow[]).map(
    (row) => ({
      purchase_request_id: purchaseRequestId,
      step_key: row.step_key,
      step_name: row.step_name,
      status: "pending" as const,
      sequence: row.sequence,
    }),
  );

  const { error: insertError } = await supabase
    .from("procurement_steps")
    .insert(stepsToInsert);

  if (insertError) {
    throw new Error(`Failed to create steps: ${insertError.message}`);
  }
}

/**
 * Set current_step_key to first step (pre_procurement) when PR enters for_procurement.
 * Call when "Mark for Procurement" is executed.
 * If steps don't exist (e.g. legacy PR), generates them first using procurementMode from ppmp_row.
 */
export async function activateFirstStep(
  purchaseRequestId: number,
  procurementMode?: string | null,
): Promise<void> {
  const { data: existingSteps } = await supabase
    .from("procurement_steps")
    .select("id")
    .eq("purchase_request_id", purchaseRequestId)
    .limit(1);

  if (!existingSteps || existingSteps.length === 0) {
    try {
      await generateSteps(purchaseRequestId, procurementMode ?? "competitive bidding");
    } catch {
      return;
    }
  }

  const { data: firstStep, error: stepError } = await supabase
    .from("procurement_steps")
    .select("step_key")
    .eq("purchase_request_id", purchaseRequestId)
    .eq("sequence", 1)
    .single();

  if (stepError || !firstStep) return;

  await supabase
    .from("procurement_steps")
    .update({ status: "in_progress" })
    .eq("purchase_request_id", purchaseRequestId)
    .eq("step_key", firstStep.step_key);

  await supabase
    .from("purchase_requests")
    .update({
      current_step_key: firstStep.step_key,
      updated_at: new Date().toISOString(),
    })
    .eq("id", purchaseRequestId);
}

/**
 * Advance from current step to next. Marks current completed, sets next as in_progress.
 * Returns the new current_step_key, or null if no more steps.
 */
export async function advanceStep(
  purchaseRequestId: number,
  completedByUserId?: number,
): Promise<string | null> {
  const { data: pr } = await supabase
    .from("purchase_requests")
    .select("current_step_key")
    .eq("id", purchaseRequestId)
    .single();

  let currentStep: { id: number; step_key: string; sequence: number } | null = null;
  if (pr?.current_step_key) {
    const { data } = await supabase
      .from("procurement_steps")
      .select("id, step_key, sequence")
      .eq("purchase_request_id", purchaseRequestId)
      .eq("step_key", pr.current_step_key)
      .single();
    currentStep = data;
  }
  if (!currentStep) {
    const { data } = await supabase
      .from("procurement_steps")
      .select("id, step_key, sequence")
      .eq("purchase_request_id", purchaseRequestId)
      .eq("status", "in_progress")
      .single();
    currentStep = data;
  }
  if (!currentStep) return null;

  await supabase
    .from("procurement_steps")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      assigned_to: completedByUserId ?? null,
    })
    .eq("id", currentStep.id);

  const { data: nextStep, error: nextError } = await supabase
    .from("procurement_steps")
    .select("step_key")
    .eq("purchase_request_id", purchaseRequestId)
    .eq("status", "pending")
    .order("sequence", { ascending: true })
    .limit(1)
    .single();

  if (nextError || !nextStep) {
    await supabase
      .from("purchase_requests")
      .update({
        current_step_key: null,
        status: "po_released",
        updated_at: new Date().toISOString(),
      })
      .eq("id", purchaseRequestId);
    return null;
  }

  await supabase
    .from("procurement_steps")
    .update({ status: "in_progress" })
    .eq("purchase_request_id", purchaseRequestId)
    .eq("step_key", nextStep.step_key);

  await supabase
    .from("purchase_requests")
    .update({
      current_step_key: nextStep.step_key,
      updated_at: new Date().toISOString(),
    })
    .eq("id", purchaseRequestId);

  return nextStep.step_key;
}

/**
 * Advance to the Notice of Award step. Finds the correct NOA step for this PR's mode
 * (notice_of_award or notice_of_award_agreement) and advances to it.
 */
export async function advanceToNoticeOfAward(
  purchaseRequestId: number,
  completedByUserId?: number,
): Promise<void> {
  const { data: noaStep } = await supabase
    .from("procurement_steps")
    .select("step_key")
    .eq("purchase_request_id", purchaseRequestId)
    .in("step_key", ["notice_of_award", "notice_of_award_agreement"])
    .eq("status", "pending")
    .order("sequence", { ascending: true })
    .limit(1)
    .single();

  if (noaStep?.step_key) {
    await advanceToStep(
      purchaseRequestId,
      noaStep.step_key,
      completedByUserId,
    );
  }
}

/**
 * Advance to the Bid Evaluation step. Jumps to the first pending step in
 * BID_EVALUATION_STEP_KEYS for this PR, skipping any intermediate steps
 * (e.g. proposal_submission for negotiated, which would otherwise hide the PR).
 */
export async function advanceToBidEvaluation(
  purchaseRequestId: number,
  completedByUserId?: number,
): Promise<void> {
  const { data: bidEvalStep } = await supabase
    .from("procurement_steps")
    .select("step_key")
    .eq("purchase_request_id", purchaseRequestId)
    .in("step_key", [...BID_EVALUATION_STEP_KEYS])
    .eq("status", "pending")
    .order("sequence", { ascending: true })
    .limit(1)
    .single();

  if (bidEvalStep?.step_key) {
    await advanceToStep(
      purchaseRequestId,
      bidEvalStep.step_key,
      completedByUserId,
    );
  }
}

/**
 * Advance directly to a specific step_key (e.g. notice_of_award after bid evaluation).
 * Marks all steps before target as completed.
 */
export async function advanceToStep(
  purchaseRequestId: number,
  targetStepKey: string,
  completedByUserId?: number,
): Promise<void> {
  const { data: targetStep, error: targetError } = await supabase
    .from("procurement_steps")
    .select("id, sequence")
    .eq("purchase_request_id", purchaseRequestId)
    .eq("step_key", targetStepKey)
    .single();

  if (targetError || !targetStep) return;

  await supabase
    .from("procurement_steps")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      assigned_to: completedByUserId ?? null,
    })
    .eq("purchase_request_id", purchaseRequestId)
    .lt("sequence", targetStep.sequence);

  await supabase
    .from("procurement_steps")
    .update({
      status: "in_progress",
      assigned_to: completedByUserId ?? null,
    })
    .eq("purchase_request_id", purchaseRequestId)
    .eq("step_key", targetStepKey);

  await supabase
    .from("purchase_requests")
    .update({
      current_step_key: targetStepKey,
      updated_at: new Date().toISOString(),
    })
    .eq("id", purchaseRequestId);
}
