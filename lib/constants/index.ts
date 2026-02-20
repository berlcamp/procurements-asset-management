export const PER_PAGE = 10;

export const userTypes = [
  "super admin",
  "admin",
  "budget officer",
  "accounting officer",
  "bac chairperson",
  "bac member",
  "schools division superintendent",
  "supply officer - division",
  "supply officer - school",
  "section chief",
  "division staff",
] as const;

/** User type derived from constants - use this for type annotations */
export type UserType = (typeof userTypes)[number];

/** User types that can access the staff management page */
export const staffAccessTypes = ["admin", "super admin"] as const;

export type StaffAccessType = (typeof staffAccessTypes)[number];

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
