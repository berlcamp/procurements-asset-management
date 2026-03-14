import { CURRENT_FISCAL_YEAR } from "@/lib/constants";
import { supabase } from "@/lib/supabase/client";

/** Standard select for PRs with full context (creator, ppmp_row, ppmp, school, office) */
const PR_SELECT =
  "*, creator:users!created_by(id, name), ppmp_row:ppmp_rows!ppmp_row_id(id, general_description, procurement_mode, estimated_budget, ppmp_id, ppmp:ppmp!ppmp_id(fiscal_year, school_id, office_id, school:schools!school_id(id, name), office:offices!office_id(id, name)))";

/**
 * Fetch PRs where current_step_key is in the given step keys.
 * Filters by CURRENT_FISCAL_YEAR on the related PPMP.
 */
export async function getPRsAtStep<T>(stepKeys: readonly string[]): Promise<T[]> {
  if (stepKeys.length === 0) return [];

  const { data, error } = await supabase
    .from("purchase_requests")
    .select(PR_SELECT)
    .in("current_step_key", [...stepKeys])
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  const allPrs = (data ?? []) as T[];
  return allPrs.filter((pr) => {
    const withPpmp = pr as { ppmp_row?: { ppmp?: { fiscal_year?: number } } | null };
    return withPpmp.ppmp_row?.ppmp?.fiscal_year === CURRENT_FISCAL_YEAR;
  });
}
