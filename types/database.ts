import type { UserType } from "@/lib/constants";

/**
 * Database Type Definitions
 */
export interface User {
  id: string;
  name: string;
  email: string;
  type?: UserType;
  designation?: string | null;
  school_id?: number | null;
  office_id?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface School {
  id: number;
  name: string;
  head_user_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Office {
  id: number;
  name: string;
  head_user_id: number | null;
  created_at: string;
  updated_at: string;
}

/** Single remark on a PPMP (e.g. from unit head on return, BAC feedback) */
export interface PPMPRemark {
  text: string;
  role?: string;
  created_at?: string;
}

/** BAC member approval record for a PPMP */
export interface PPMPBacApproval {
  id: number;
  ppmp_id: number;
  user_id: number;
  approved_at: string;
}

/** Audit log entry for a PPMP action */
export interface PPMPAuditLog {
  id: number;
  ppmp_id: number;
  user_id: number | null;
  action: string;
  from_status: string | null;
  to_status: string | null;
  remarks: string | null;
  created_at: string;
  user?: { id: number; name: string } | null;
}

export interface PPMP {
  id: number;
  fiscal_year: number;
  end_user_type: "school" | "office";
  school_id: number | null;
  office_id: number | null;
  status: string;
  remarks?: PPMPRemark[];
  created_at: string;
  updated_at: string;
  school?: { id: number; name: string; head_user_id?: number | null };
  office?: { id: number; name: string; head_user_id?: number | null };
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

/** Item within a lot */
export interface PPMPRowLotItem {
  description?: string;
  quantity?: number;
  unit?: string;
  estimated_cost?: number;
}

/** Lot containing multiple items */
export interface PPMPRowLot {
  name?: string;
  items: PPMPRowLotItem[];
}

/** Attachment metadata */
export interface PPMPRowAttachment {
  name: string;
  url: string;
}

export interface PPMPRow {
  id: number;
  ppmp_id: number;
  general_description: string | null;
  project_type: "goods" | "infrastructure" | "consulting_services" | null;
  items: PPMPRowLot[];
  procurement_mode: string | null;
  pre_procurement_conference: boolean;
  procurement_start_date: string | null;
  procurement_end_date: string | null;
  delivery_period: string | null;
  source_of_funds: string | null;
  estimated_budget: number | null;
  attachments: PPMPRowAttachment[];
  remarks: string[];
  created_at: string;
  updated_at: string;
}
