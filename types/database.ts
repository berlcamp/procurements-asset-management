import type { UserType } from "@/lib/constants";

/**
 * Database Type Definitions
 */
export interface User {
  id: string;
  name: string;
  email: string;
  type?: UserType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
