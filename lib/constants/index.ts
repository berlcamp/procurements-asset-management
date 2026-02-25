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

export type StaffAccessType = (typeof staffAccessTypes)[number];

/** User types that require a school (school_id set, office_id null) */
export const schoolUserTypes = [
  "supply officer - school",
  "school head",
  "school staff",
] as const;

/** User types that require an office (office_id set, school_id null) */
export const divisionUserTypes = [
  "supply officer - division",
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
