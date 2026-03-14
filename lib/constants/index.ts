export const PER_PAGE = 10;

/** Current fiscal year - set via NEXT_PUBLIC_CURRENT_FISCAL_YEAR in .env.local. Basis for PPMP and APP creation. */
export const CURRENT_FISCAL_YEAR = Number(
  process.env.NEXT_PUBLIC_CURRENT_FISCAL_YEAR ?? new Date().getFullYear(),
);

export const userTypes = [
  "super admin",
  "admin",
  "budget officer",
  "accounting officer",
  "procurement officer",
  "bac chairperson",
  "bac vice chairperson",
  "bac secretariat",
  "bac member",
  "schools division superintendent",
  "supply officer - division",
  "supply officer - school",
  "section chief",
  "division staff",
  "school staff",
  "school head",
] as const;

/** User type derived from constants - use this for type annotations */
export type UserType = (typeof userTypes)[number];

/** User types that belong to the BAC (Bids and Awards Committee) */
export const bacUserTypes = [
  "bac chairperson",
  "bac vice chairperson",
  "bac member",
  "bac secretariat",
] as const;
export type BacUserType = (typeof bacUserTypes)[number];

/** User types that can submit PPMP to HOPE (Secretariat, Chairperson, Vice Chairperson - NOT bac member) */
export const bacSubmitterToHopeTypes = [
  "bac chairperson",
  "bac vice chairperson",
  "bac secretariat",
] as const;

/** Returns true if the user type is a BAC member */
export function isBacUser(type: string | undefined): boolean {
  return type != null && (bacUserTypes as readonly string[]).includes(type);
}

/** Returns true if the user type can submit PPMP to HOPE (BAC Secretariat, Chairperson, Vice Chairperson) */
export function isBacSubmitterToHope(type: string | undefined): boolean {
  return (
    type != null &&
    (bacSubmitterToHopeTypes as readonly string[]).includes(type)
  );
}

/** Returns true if the user type is BAC Secretariat */
export function isBacSecretariat(type: string | undefined): boolean {
  return type === "bac secretariat";
}

/** Returns true if the user type is Budget Officer */
export function isBudgetOfficer(type: string | undefined): boolean {
  return type === "budget officer";
}

/** Returns true if the user type is HOPE (Schools Division Superintendent) */
export function isHope(type: string | undefined): boolean {
  return type === "schools division superintendent";
}

/** User types that can access the staff management page */
export const staffAccessTypes = ["admin", "super admin"] as const;

/** User types that can access the Budget Planning menu (LASA, Budget Allocations) */
export const budgetPlanningAccessTypes = [
  "schools division superintendent",
  "budget officer",
] as const;
export type BudgetPlanningAccessType =
  (typeof budgetPlanningAccessTypes)[number];

/** Returns true if the user type can access Budget Planning features */
export function hasBudgetPlanningAccess(type: string | undefined): boolean {
  return (
    type != null &&
    (budgetPlanningAccessTypes as readonly string[]).includes(type)
  );
}

/** User types that can access the Procurement Execution menu (Purchase Requests, Pre-Procurement, RFQ, etc.) */
export const procurementExecutionAccessTypes = [
  "budget officer",
  "accounting officer",
  "procurement officer",
  "bac chairperson",
  "bac vice chairperson",
  "bac secretariat",
  "bac member",
  "schools division superintendent",
] as const;
export type ProcurementExecutionAccessType =
  (typeof procurementExecutionAccessTypes)[number];

/** Returns true if the user type can access Procurement Execution features */
export function hasProcurementExecutionAccess(type: string | undefined): boolean {
  return (
    type != null &&
    (procurementExecutionAccessTypes as readonly string[]).includes(type)
  );
}

export type StaffAccessType = (typeof staffAccessTypes)[number];

/** User types that require a school (school_id set, office_id null) */
export const schoolUserTypes = [
  "supply officer - school",
  "school head",
  "school staff",
] as const;

/** User types that require an office (office_id set, school_id null) */
export const divisionUserTypes = [
  "super admin",
  "admin",
  "budget officer",
  "accounting officer",
  "procurement officer",
  "bac chairperson",
  "bac vice chairperson",
  "bac secretariat",
  "bac member",
  "schools division superintendent",
  "supply officer - division",
  "section chief",
  "division staff",
] as const;

/** Account types derived from user type */
export const accountTypes = ["school", "office"] as const;
export type AccountType = (typeof accountTypes)[number];

/** Returns account_type: 'school' for supply officer - school | school staff, else 'office' */
export function getAccountType(type: string | undefined): AccountType {
  return isSchoolUserType(type) ? "school" : "office";
}

/** Returns true if the user type requires school selection */
export function isSchoolUserType(type: string | undefined): boolean {
  return type != null && (schoolUserTypes as readonly string[]).includes(type);
}

/** Returns true if the user type requires office selection (account_type = 'office') */
export function isDivisionUserType(type: string | undefined): boolean {
  return (
    type != null && (divisionUserTypes as readonly string[]).includes(type)
  );
}

/** Returns true if account_type = 'office' (requires office_id) */
export function isOfficeAccountType(type: string | undefined): boolean {
  return type != null && getAccountType(type) === "office";
}

/** Returns true if the user type has staff management access */
export function hasStaffAccess(type: string | undefined): boolean {
  return type != null && (staffAccessTypes as readonly string[]).includes(type);
}

/** Formats a user type for display (e.g. "super admin" → "Super Admin") */
export function formatUserTypeLabel(type: string): string {
  return type
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/** Formats a PPMP status for display (e.g. "submitted_to_bac" → "Submitted to BAC") */
export function formatPPMPStatusLabel(status: string): string {
  const s = status || "draft";
  return s
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/** Purchase Request statuses through the procurement workflow */
export const PR_STATUSES = [
  "draft",
  "submitted",
  "funds_certified",
  "hope_approved",
  "for_procurement",
  "ready_for_rfq_bidding",
  "for_bid_evaluation",
  "for_notice_of_award",
  "for_purchase_order",
  "po_released",
] as const;
export type PurchaseRequestStatusType = (typeof PR_STATUSES)[number];

/** Formats a PR status for display (e.g. "funds_certified" → "Funds Certified") */
export function formatPRStatusLabel(status: string): string {
  const s = status || "draft";
  return s
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/** Returns Tailwind classes for PR status badge */
export function getPRStatusBadgeClass(status: string): string {
  const s = status || "draft";
  const base =
    "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium";
  if (s === "draft")
    return `${base} bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300`;
  if (
    s === "submitted" ||
    s === "funds_certified" ||
    s === "hope_approved" ||
    s === "for_procurement"
  )
    return `${base} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200`;
  if (
    s === "ready_for_rfq_bidding" ||
    s === "for_bid_evaluation" ||
    s === "for_notice_of_award" ||
    s === "for_purchase_order" ||
    s === "po_released"
  )
    return `${base} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200`;
  return `${base} bg-muted text-muted-foreground`;
}

/** Returns true if user can certify funds (Budget Officer) */
export function canCertifyFunds(
  userType: string | undefined,
  status: string,
): boolean {
  return isBudgetOfficer(userType) && status === "submitted";
}

/** Returns true if user can approve as HoPE */
export function canApproveHope(
  userType: string | undefined,
  status: string,
): boolean {
  return isHope(userType) && status === "funds_certified";
}

/** Returns true if user can mark PR for procurement (BAC Secretariat) */
export function canMarkForProcurement(
  userType: string | undefined,
  status: string,
): boolean {
  return isBacSecretariat(userType) && status === "hope_approved";
}

/** PPMP project types */
export const PPMP_PROJECT_TYPES = [
  "goods",
  "infrastructure",
  "consulting_services",
] as const;
export type PPMPProjectType = (typeof PPMP_PROJECT_TYPES)[number];

/** PPMP procurement modes */
export const PPMP_PROCUREMENT_MODES = [
  "competitive bidding",
  "negotiated procurement",
  "small value procurement",
  "direct contracting",
  "repeat order",
  "agency to agency",
  "others",
] as const;
export type PPMPProcurementMode = (typeof PPMP_PROCUREMENT_MODES)[number];

/** Procurement mode keys (snake_case) for workflow config */
export const PROCUREMENT_MODE_KEYS = [
  "competitive_bidding",
  "negotiated_procurement",
  "small_value_procurement",
  "direct_contracting",
  "repeat_order",
  "agency_to_agency",
] as const;
export type ProcurementModeKey = (typeof PROCUREMENT_MODE_KEYS)[number];

/** Step keys for Pre-Procurement page */
export const PRE_PROCUREMENT_STEP_KEYS = ["pre_procurement"] as const;

/** Step keys for RFQ / Bidding page */
export const RFQ_BIDDING_STEP_KEYS = [
  "rfq_preparation",
  "advertisement_invitation",
  "pre_bid_conference",
  "bid_submission",
  "bid_opening",
  "negotiation",
  "request_proposal",
  "verify_previous_contract",
  "coordination",
] as const;

/** Step keys for Bid Evaluation page */
export const BID_EVALUATION_STEP_KEYS = [
  "bid_evaluation",
  "evaluation",
  "abstract_of_quotations",
  "technical_evaluation",
  "bac_recommendation",
] as const;

/** Step keys for Notice of Award page */
export const NOTICE_OF_AWARD_STEP_KEYS = [
  "notice_of_award",
  "notice_of_award_agreement",
] as const;

/** Step key for Purchase Orders page */
export const PURCHASE_ORDER_STEP_KEY = "purchase_order";
