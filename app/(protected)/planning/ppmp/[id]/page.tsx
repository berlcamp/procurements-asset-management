"use client";

import { ConfirmationModal } from "@/components/ConfirmationModal";
import { RemarksCell } from "@/components/RemarksCell";
import { TableSkeleton } from "@/components/TableSkeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import {
  formatPPMPStatusLabel,
  formatUserTypeLabel,
  isBacSecretariat,
  isBacSubmitterToHope,
  isBacUser,
  isBudgetOfficer,
  isHope,
} from "@/lib/constants";
import { useAppSelector } from "@/lib/redux/hook";
import { supabase } from "@/lib/supabase/client";
import type {
  App,
  PPMP,
  PPMPAuditLog,
  PPMPBacApproval,
  PPMPRemark,
  PPMPRow,
  PPMPRowLot,
  PPMPRowLotItem,
  PPMPRowRemarkRow,
} from "@/types/database";
import {
  ArrowLeft,
  ArrowLeftToLine,
  Building2,
  Check,
  ClipboardList,
  FileText,
  History,
  MoreVertical,
  Pencil,
  Plus,
  School,
  Send,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CreatePRModal, getItemKey } from "../CreatePRModal";
import { AddRowWizardModal } from "../AddRowWizardModal";

type PPMPRowWithRemarks = PPMPRow & { ppmp_row_remarks?: PPMPRowRemarkRow[] };

const PROJECT_TYPE_LABELS: Record<string, string> = {
  goods: "Goods",
  infrastructure: "Infrastructure",
  consulting_services: "Consulting Services",
};

function LotsItemsCell({
  lots,
  itemsInPRs,
}: {
  lots: PPMPRowLot[];
  itemsInPRs: Set<string>;
}) {
  if (!lots || lots.length === 0)
    return <span className="text-muted-foreground">-</span>;
  return (
    <span className="block text-xs leading-relaxed space-y-1">
      {lots.map((lot, lotIdx) => {
        const lotName = lot.name?.trim() || `Lot ${lotIdx + 1}`;
        const items = lot.items ?? [];
        if (items.length === 0)
          return (
            <span key={lotIdx} className="block">
              {lotName}: (no items)
            </span>
          );
        return (
          <span key={lotIdx} className="block">
            {lotName}:{" "}
            {(items as PPMPRowLotItem[]).map((item, itemIdx) => {
              const key = getItemKey(lotIdx, itemIdx);
              const inPR = itemsInPRs.has(key);
              const desc = item.description?.trim() || "-";
              const qty = item.quantity != null ? item.quantity : "-";
              const unit = item.unit?.trim() || "";
              const cost =
                item.estimated_cost != null
                  ? item.estimated_cost.toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                    })
                  : "-";
              const text = `${desc} (${qty}${unit ? ` ${unit}` : ""}) — PhP ${cost}`;
              return (
                <span key={itemIdx}>
                  {itemIdx > 0 && "; "}
                  {inPR ? (
                    <span className="rounded bg-green-100 px-1 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                      {text}
                    </span>
                  ) : (
                    text
                  )}
                </span>
              );
            })}
          </span>
        );
      })}
    </span>
  );
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "-";
  }
}

function formatProcurementBlock(row: PPMPRow): string {
  const parts: string[] = [];
  if (row.procurement_mode) parts.push(row.procurement_mode);
  parts.push(`Pre-Proc: ${row.pre_procurement_conference ? "Yes" : "No"}`);
  if (row.procurement_start_date || row.procurement_end_date) {
    parts.push(
      `${formatDate(row.procurement_start_date)} – ${formatDate(row.procurement_end_date)}`,
    );
  }
  if (row.delivery_period)
    parts.push(`Delivery: ${formatDate(row.delivery_period)}`);
  return parts.length ? parts.join(" · ") : "-";
}

function formatBudgetBlock(row: PPMPRow): string {
  const parts: string[] = [];
  if (row.source_of_funds) parts.push(row.source_of_funds);
  if (row.estimated_budget != null) {
    parts.push(
      `PhP ${row.estimated_budget.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
    );
  }
  if (row.attachments?.length) parts.push(`${row.attachments.length} file(s)`);
  return parts.length ? parts.join(" · ") : "-";
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  submit_to_unit_head: "Submitted to Unit Head",
  submit_to_budget: "Submitted to Budget Officer",
  submit_to_bac: "Submitted to BAC",
  submit_to_hope: "Submitted to HOPE",
  return: "Returned",
  bac_approval: "BAC Approval",
  approved_by_hope: "Approved by HOPE",
  revise: "Revised & Resubmitted",
};

function formatAuditAction(action: string): string {
  return (
    AUDIT_ACTION_LABELS[action] ??
    action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function isUnitHead(
  ppmp: PPMP | null,
  systemUserId: number | undefined,
): boolean {
  if (!ppmp || systemUserId == null) return false;
  if (ppmp.end_user_type === "school" && ppmp.school?.head_user_id) {
    return ppmp.school.head_user_id === systemUserId;
  }
  if (ppmp.end_user_type === "office" && ppmp.office?.head_user_id) {
    return ppmp.office.head_user_id === systemUserId;
  }
  return false;
}

export default function PPMPDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const user = useAppSelector((state) => state.user.user);
  const systemUserId = user?.system_user_id as number | undefined;

  const [ppmp, setPpmp] = useState<PPMP | null>(null);
  const [rows, setRows] = useState<PPMPRowWithRemarks[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<PPMPRow | null>(null);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitToBudgetModalOpen, setSubmitToBudgetModalOpen] = useState(false);
  const [submitToHopeModalOpen, setSubmitToHopeModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [returnAction, setReturnAction] = useState<
    | "returned"
    | "returned_to_unit_head"
    | "returned_to_budget"
    | null
  >(null);
  const [returnRemarks, setReturnRemarks] = useState("");
  const [bacMembers, setBacMembers] = useState<
    { id: number; name: string; type: string }[]
  >([]);
  const [bacApprovals, setBacApprovals] = useState<PPMPBacApproval[]>([]);
  const [approvingUserId, setApprovingUserId] = useState<number | null>(null);
  const [auditLog, setAuditLog] = useState<PPMPAuditLog[]>([]);
  const [appApproval, setAppApproval] = useState<App | null>(null);
  const [prItemsByRow, setPrItemsByRow] = useState<Map<number, Set<string>>>(
    new Map()
  );
  const [createPRRow, setCreatePRRow] = useState<PPMPRow | null>(null);

  const logAudit = useCallback(
    async (params: {
      action: string;
      fromStatus: string;
      toStatus: string;
      remarks?: string;
    }) => {
      if (!id || isNaN(id)) return;
      await supabase.from("ppmp_audit_log").insert({
        ppmp_id: id,
        user_id: systemUserId ?? null,
        action: params.action,
        from_status: params.fromStatus,
        to_status: params.toStatus,
        remarks: params.remarks ?? null,
      });
    },
    [id, systemUserId],
  );

  const refreshAuditLog = useCallback(async () => {
    if (!id || isNaN(id)) return;
    const { data } = await supabase
      .from("ppmp_audit_log")
      .select("*, user:users!user_id(id, name)")
      .eq("ppmp_id", id)
      .order("created_at", { ascending: false });
    setAuditLog((data as PPMPAuditLog[]) ?? []);
  }, [id]);

  const fetchData = useCallback(async () => {
    if (!id || isNaN(id)) return;

    const { data: ppmpData, error: ppmpError } = await supabase
      .from("ppmp")
      .select(
        "*, school:schools!school_id(id, name, head_user_id), office:offices!office_id(id, name, head_user_id)",
      )
      .eq("id", id)
      .single();

    if (ppmpError || !ppmpData) {
      toast.error("PPMP not found");
      router.push("/planning/ppmp");
      return;
    }

    const { data: rowsData, error: rowsError } = await supabase
      .from("ppmp_rows")
      .select("*, ppmp_row_remarks(id, text, role, created_at)")
      .eq("ppmp_id", id)
      .order("created_at", { ascending: true });

    if (!rowsError) {
      setRows((rowsData as PPMPRowWithRemarks[]) ?? []);
    }
    setPpmp(ppmpData as PPMP);

    // Fetch audit log with user names
    const { data: auditData } = await supabase
      .from("ppmp_audit_log")
      .select("*, user:users!user_id(id, name)")
      .eq("ppmp_id", id)
      .order("created_at", { ascending: false });
    setAuditLog((auditData as PPMPAuditLog[]) ?? []);

    // Fetch BAC members and approvals when PPMP is with BAC
    const ppmpStatus = (ppmpData as PPMP)?.status;
    if (ppmpStatus === "submitted_to_bac" || ppmpStatus === "returned_to_bac") {
      const { data: bacMembersData } = await supabase
        .from("users")
        .select("id, name, type")
        .eq("is_active", true)
        .in("type", ["bac chairperson", "bac vice chairperson", "bac member"]);
      setBacMembers(
        (bacMembersData as { id: number; name: string; type: string }[]) ?? [],
      );

      const { data: approvalsData } = await supabase
        .from("ppmp_bac_approvals")
        .select("*")
        .eq("ppmp_id", id);
      setBacApprovals((approvalsData as PPMPBacApproval[]) ?? []);
    } else {
      setBacMembers([]);
      setBacApprovals([]);
    }

    // Fetch APP approval for fiscal year
    const fiscalYear = (ppmpData as PPMP)?.fiscal_year;
    if (fiscalYear) {
      const { data: appData } = await supabase
        .from("app")
        .select("*")
        .eq("fiscal_year", fiscalYear)
        .maybeSingle();
      setAppApproval((appData as App | null) ?? null);
    } else {
      setAppApproval(null);
    }

    // Fetch purchase_request_items for this PPMP's rows to highlight items in PRs
    const rowIds = (rowsData as { id: number }[] ?? []).map((r) => r.id);
    if (rowIds.length > 0) {
      const { data: priData } = await supabase
        .from("purchase_request_items")
        .select("ppmp_row_id, lot_index, item_index")
        .in("ppmp_row_id", rowIds);
      const byRow = new Map<number, Set<string>>();
      for (const pri of priData ?? []) {
        const r = pri as {
          ppmp_row_id: number;
          lot_index: number;
          item_index: number;
        };
        if (!byRow.has(r.ppmp_row_id)) byRow.set(r.ppmp_row_id, new Set());
        byRow.get(r.ppmp_row_id)!.add(getItemKey(r.lot_index, r.item_index));
      }
      setPrItemsByRow(byRow);
    } else {
      setPrItemsByRow(new Map());
    }

    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddRowSuccess = (row: PPMPRow) => {
    setRows((prev) => [...prev, row]);
    setWizardOpen(false);
  };

  const handleEditRowSuccess = (row: PPMPRow) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? { ...row, ppmp_row_remarks: r.ppmp_row_remarks ?? [] }
          : r,
      ),
    );
    setEditingRow(null);
  };

  const handleDeleteRow = async (row: PPMPRow) => {
    const { error } = await supabase
      .from("ppmp_rows")
      .delete()
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
    } else {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      toast.success("Row deleted");
    }
  };

  const handleSubmitToUnitHead = async () => {
    if (!ppmp || ppmp.status !== "draft") return;
    if (rows.length === 0) {
      toast.error("Add at least one procurement row before submitting.");
      return;
    }
    const { error } = await supabase
      .from("ppmp")
      .update({
        status: "submitted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ppmp.id);
    if (error) {
      toast.error(error.message);
      throw error;
    }
    await logAudit({
      action: "submit_to_unit_head",
      fromStatus: "draft",
      toStatus: "submitted",
    });
    refreshAuditLog();

    const unitHeadId =
      ppmp.end_user_type === "school"
        ? ppmp.school?.head_user_id
        : ppmp.office?.head_user_id;
    if (unitHeadId) {
      const endUserName =
        ppmp.end_user_type === "school"
          ? (ppmp.school?.name ?? "School")
          : (ppmp.office?.name ?? "Office");
      await supabase.from("notifications").insert({
        user_id: unitHeadId,
        type: "ppmp_submitted",
        title: "PPMP Submitted for Review",
        message: `${endUserName} FY${ppmp.fiscal_year} PPMP has been submitted and requires your review.`,
        link: `/planning/ppmp/${ppmp.id}`,
      });
    }

    setPpmp((prev) =>
      prev
        ? { ...prev, status: "submitted", updated_at: new Date().toISOString() }
        : null,
    );
    toast.success("PPMP submitted to Unit Head successfully.");
  };

  const handleSubmitToBudget = async () => {
    if (!ppmp || !["submitted", "returned_to_unit_head"].includes(ppmp.status))
      return;
    const fromStatus =
      ppmp.status === "returned_to_unit_head"
        ? "returned_to_unit_head"
        : "submitted";
    const { error } = await supabase
      .from("ppmp")
      .update({
        status: "submitted_to_budget",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ppmp.id);
    if (error) {
      toast.error(error.message);
      throw error;
    }
    await logAudit({
      action: "submit_to_budget",
      fromStatus,
      toStatus: "submitted_to_budget",
    });
    refreshAuditLog();
    setPpmp((prev) =>
      prev
        ? {
            ...prev,
            status: "submitted_to_budget",
            updated_at: new Date().toISOString(),
          }
        : null,
    );

    const { data: budgetOfficers } = await supabase
      .from("users")
      .select("id")
      .eq("is_active", true)
      .eq("type", "budget officer");
    if (budgetOfficers?.length) {
      const endUserLabel = getEndUserLabel(ppmp);
      const ppmpLink = `/planning/ppmp/${ppmp.id}`;
      await supabase.from("notifications").insert(
        budgetOfficers.map((u) => ({
          user_id: u.id,
          type: "ppmp_submitted_to_budget",
          title: "PPMP submitted for budget review",
          message: `PPMP for FY${ppmp.fiscal_year} — ${endUserLabel} requires your budget review.`,
          link: ppmpLink,
        })),
      );
    }
    toast.success("PPMP submitted to Budget Officer successfully.");
  };

  const handleSubmitToHope = async () => {
    if (
      !ppmp ||
      ![
        "submitted_to_budget",
        "returned_to_budget",
        "submitted_to_bac",
        "returned_to_bac",
      ].includes(ppmp.status)
    )
      return;
    const { error } = await supabase
      .from("ppmp")
      .update({
        status: "submitted_to_hope",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ppmp.id);
    if (error) {
      toast.error(error.message);
      throw error;
    }
    await logAudit({
      action: "submit_to_hope",
      fromStatus: ppmp.status,
      toStatus: "submitted_to_hope",
    });
    refreshAuditLog();
    setPpmp((prev) =>
      prev
        ? {
            ...prev,
            status: "submitted_to_hope",
            updated_at: new Date().toISOString(),
          }
        : null,
    );

    const { data: hopeUsers } = await supabase
      .from("users")
      .select("id")
      .eq("is_active", true)
      .eq("type", "schools division superintendent");
    if (hopeUsers?.length) {
      const endUserLabel = getEndUserLabel(ppmp);
      const ppmpLink = `/planning/ppmp/${ppmp.id}`;
      await supabase.from("notifications").insert(
        hopeUsers.map((u) => ({
          user_id: u.id,
          type: "ppmp_submitted_to_hope",
          title: "PPMP submitted for approval",
          message: `PPMP for FY${ppmp.fiscal_year} — ${endUserLabel} requires your approval.`,
          link: ppmpLink,
        })),
      );
    }
    toast.success("PPMP submitted to HOPE successfully.");
  };

  const appendRemark = (remark: PPMPRemark): PPMPRemark[] => {
    const existing = (ppmp?.remarks as PPMPRemark[] | undefined) ?? [];
    return [...existing, remark];
  };

  const handleRevise = async () => {
    if (!ppmp || ppmp.status !== "returned") return;
    const { error } = await supabase
      .from("ppmp")
      .update({
        status: "draft",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ppmp.id);
    if (error) {
      toast.error(error.message);
      throw error;
    }
    await logAudit({
      action: "revise",
      fromStatus: "returned",
      toStatus: "draft",
    });
    refreshAuditLog();
    setPpmp((prev) =>
      prev
        ? { ...prev, status: "draft", updated_at: new Date().toISOString() }
        : null,
    );
    toast.success("PPMP status set to draft. You can now edit and resubmit.");
  };

  type ReturnRole = "unit_head" | "budget_officer" | "bac" | "hope";

  const getCurrentUserRemarkRole = (): ReturnRole => {
    if (isUnitHead(ppmp, systemUserId)) return "unit_head";
    if (isBudgetOfficer(user?.type)) return "budget_officer";
    if (isBacUser(user?.type)) return "bac";
    if (isHope(user?.type)) return "hope";
    return "unit_head";
  };

  const handleReturn = async () => {
    if (!ppmp || !returnAction) return;
    const remarksText = returnRemarks.trim();
    if (!remarksText) {
      toast.error("Remarks are required when returning a PPMP.");
      return;
    }
    const newRemark: PPMPRemark = {
      text: remarksText,
      role: getCurrentUserRemarkRole(),
      created_at: new Date().toISOString(),
    };
    const updatedRemarks = appendRemark(newRemark);
    const { error } = await supabase
      .from("ppmp")
      .update({
        status: returnAction,
        remarks: updatedRemarks,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ppmp.id);
    if (error) {
      toast.error(error.message);
      throw error;
    }
    await logAudit({
      action: "return",
      fromStatus: ppmp.status,
      toStatus: returnAction,
      remarks: remarksText,
    });
    refreshAuditLog();
    setPpmp((prev) =>
      prev
        ? {
            ...prev,
            status: returnAction,
            remarks: updatedRemarks,
            updated_at: new Date().toISOString(),
          }
        : null,
    );

    const endUserLabel = getEndUserLabel(ppmp);
    const ppmpLink = `/planning/ppmp/${ppmp.id}`;

    if (returnAction === "returned_to_unit_head") {
      const unitHeadId =
        ppmp.end_user_type === "school"
          ? ppmp.school?.head_user_id
          : ppmp.office?.head_user_id;
      if (unitHeadId) {
        await supabase.from("notifications").insert({
          user_id: unitHeadId,
          type: "ppmp_returned_to_unit_head",
          title: "PPMP returned to you",
          message: `PPMP FY${ppmp.fiscal_year} — ${endUserLabel} was returned by Budget Officer and requires your action.`,
          link: ppmpLink,
        });
      }
    } else if (returnAction === "returned_to_budget") {
      const { data: budgetOfficers } = await supabase
        .from("users")
        .select("id")
        .eq("is_active", true)
        .eq("type", "budget officer");
      if (budgetOfficers?.length) {
        await supabase.from("notifications").insert(
          budgetOfficers.map((u) => ({
            user_id: u.id,
            type: "ppmp_returned_to_budget",
            title: "PPMP returned to Budget",
            message: `PPMP FY${ppmp.fiscal_year} — ${endUserLabel} was returned and requires your budget review.`,
            link: ppmpLink,
          })),
        );
      }
    }

    setReturnModalOpen(false);
    setReturnAction(null);
    setReturnRemarks("");
    toast.success("PPMP returned with your remarks.");
  };

  const openReturnModal = (action: NonNullable<typeof returnAction>) => {
    setReturnAction(action);
    setReturnModalOpen(true);
  };

  const handleApprove = async () => {
    if (!ppmp || ppmp.status !== "submitted_to_hope") return;
    const { error } = await supabase
      .from("ppmp")
      .update({
        status: "approved_by_hope",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ppmp.id);
    setApproveModalOpen(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit({
      action: "approved_by_hope",
      fromStatus: "submitted_to_hope",
      toStatus: "approved_by_hope",
    });
    refreshAuditLog();
    setPpmp((prev) => (prev ? { ...prev, status: "approved_by_hope" } : prev));
    toast.success("PPMP approved successfully.");
  };

  const getEndUserLabel = (p: PPMP) => {
    if (p.end_user_type === "school" && p.school?.name) return p.school.name;
    if (p.end_user_type === "office" && p.office?.name) return p.office.name;
    return "-";
  };

  const isBacMember = isBacUser(user?.type);
  const bacApprovalByUser = new Map(bacApprovals.map((a) => [a.user_id, a]));

  const appApproved = appApproval?.approved_at != null;
  const isProjectCreator =
    ppmp?.created_by != null && ppmp.created_by === systemUserId;
  const canCreatePR =
    ppmp?.status === "approved_by_hope" &&
    appApproved &&
    isProjectCreator &&
    systemUserId != null;

  const canBacSecretariatEditRows =
    (ppmp?.status === "submitted_to_bac" ||
      ppmp?.status === "returned_to_bac") &&
    isBacSecretariat(user?.type);

  const handleBacApprove = async () => {
    if (
      !ppmp ||
      (ppmp.status !== "submitted_to_bac" &&
        ppmp.status !== "returned_to_bac") ||
      !systemUserId
    )
      return;
    if (bacApprovalByUser.has(systemUserId)) {
      toast.error("You have already approved this PPMP.");
      return;
    }
    setApprovingUserId(systemUserId);
    const { data, error } = await supabase
      .from("ppmp_bac_approvals")
      .insert({ ppmp_id: ppmp.id, user_id: systemUserId })
      .select()
      .single();
    setApprovingUserId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit({
      action: "bac_approval",
      fromStatus: ppmp.status,
      toStatus: ppmp.status,
      remarks: "BAC member approved",
    });
    refreshAuditLog();
    setBacApprovals((prev) => [...prev, data as PPMPBacApproval]);
    toast.success("PPMP approved successfully.");
  };

  if (loading || !ppmp) {
    return (
      <div className="app__content">
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div>
      <div className="app__title p-4">
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <Link
              href={
                isUnitHead(ppmp, systemUserId)
                  ? "/planning/ppmp"
                  : "/planning/ppmp-submissions"
              }
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to PPMP
            </Link>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <h1 className="app__title_text flex items-center gap-2">
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                PPMP — FY {ppmp.fiscal_year}
              </h1>
              <span className="inline-flex w-fit items-center rounded-full border border-green-300 bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:border-green-700 dark:bg-green-900/50 dark:text-green-300">
                {formatPPMPStatusLabel(ppmp.status ?? "draft")}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {getEndUserLabel(ppmp)}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                  ppmp.end_user_type === "school"
                    ? "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-800"
                    : "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800"
                }`}
              >
                {ppmp.end_user_type === "school" ? (
                  <School className="h-3.5 w-3.5" />
                ) : (
                  <Building2 className="h-3.5 w-3.5" />
                )}
                {ppmp.end_user_type === "school" ? "School" : "Office"}
              </span>
            </div>
          </div>
          {ppmp.status === "draft" && (
            <div className="app__title_actions flex shrink-0 flex-wrap items-center gap-2">
              <Button
                variant="green"
                size="sm"
                onClick={() => {
                  setEditingRow(null);
                  setWizardOpen(true);
                }}
                className="shadow-sm"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Row
              </Button>
              <Button
                variant="blue"
                size="sm"
                onClick={() => {
                  if (rows.length === 0) {
                    toast.error(
                      "Add at least one procurement row before submitting.",
                    );
                    return;
                  }
                  setSubmitModalOpen(true);
                }}
                className="shadow-sm ring-1 ring-blue-600/20 hover:ring-blue-600/40"
              >
                <Send className="mr-1.5 h-4 w-4" />
                Submit to Unit Head
              </Button>
            </div>
          )}
          {ppmp.status === "returned" && (
            <div className="app__title_actions flex shrink-0 flex-wrap items-center gap-2">
              <Button
                variant="green"
                size="sm"
                onClick={handleRevise}
                className="shadow-sm"
              >
                <Pencil className="mr-1.5 h-4 w-4" />
                Revise & Resubmit
              </Button>
            </div>
          )}
          {(ppmp.status === "submitted" ||
            ppmp.status === "returned_to_unit_head") &&
            isUnitHead(ppmp, systemUserId) && (
              <div className="app__title_actions flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  variant="blue"
                  size="sm"
                  onClick={() => setSubmitToBudgetModalOpen(true)}
                  className="shadow-sm ring-1 ring-blue-600/20 hover:ring-blue-600/40"
                >
                  <Send className="mr-1.5 h-4 w-4" />
                  Submit to Budget
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openReturnModal("returned")}
                  className="shadow-sm border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/50"
                >
                  <ArrowLeftToLine className="mr-1.5 h-4 w-4" />
                  Return to Proponent
                </Button>
              </div>
            )}
          {(ppmp.status === "submitted_to_budget" ||
            ppmp.status === "returned_to_budget") &&
            isBudgetOfficer(user?.type) && (
              <div className="app__title_actions flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  variant="blue"
                  size="sm"
                  onClick={() => setSubmitToHopeModalOpen(true)}
                  className="shadow-sm ring-1 ring-blue-600/20 hover:ring-blue-600/40"
                >
                  <Send className="mr-1.5 h-4 w-4" />
                  Submit to HOPE
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openReturnModal("returned_to_unit_head")}
                  className="shadow-sm border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/50"
                >
                  <ArrowLeftToLine className="mr-1.5 h-4 w-4" />
                  Return to Unit Head
                </Button>
              </div>
            )}
          {(ppmp.status === "submitted_to_bac" ||
            ppmp.status === "returned_to_bac") &&
            isBacSubmitterToHope(user?.type) && (
              <div className="app__title_actions flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  variant="blue"
                  size="sm"
                  onClick={() => setSubmitToHopeModalOpen(true)}
                  className="shadow-sm ring-1 ring-blue-600/20 hover:ring-blue-600/40"
                >
                  <Send className="mr-1.5 h-4 w-4" />
                  Submit to HOPE
                </Button>
              </div>
            )}
          {ppmp.status === "submitted_to_hope" && isHope(user?.type) && (
            <div className="app__title_actions flex shrink-0 flex-wrap items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setApproveModalOpen(true)}
                className="shadow-sm bg-green-600 hover:bg-green-700"
              >
                <Check className="mr-1.5 h-4 w-4" />
                Approved
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openReturnModal("returned_to_budget")}
                className="shadow-sm border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/50"
              >
                <ArrowLeftToLine className="mr-1.5 h-4 w-4" />
                Return to Budget
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openReturnModal("returned")}
                className="shadow-sm border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/50"
              >
                <ArrowLeftToLine className="mr-1.5 h-4 w-4" />
                Return to Proponent
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="app__content">
        {(ppmp.status === "submitted_to_bac" ||
          ppmp.status === "returned_to_bac") &&
          bacMembers.length > 0 && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
              <h3 className="mb-3 text-sm font-semibold text-blue-800 dark:text-blue-200">
                BAC Approval Status
              </h3>
              <ul className="space-y-2">
                {bacMembers.map((member) => {
                  const approval = bacApprovalByUser.get(member.id);
                  const isCurrentUser = member.id === systemUserId;
                  const canApprove =
                    isBacMember &&
                    isCurrentUser &&
                    !approval &&
                    (ppmp.status === "submitted_to_bac" ||
                      ppmp.status === "returned_to_bac");

                  return (
                    <li
                      key={member.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white/60 px-3 py-2 dark:bg-black/20"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {member.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({formatUserTypeLabel(member.type)})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {approval ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/50 dark:text-green-300">
                            <Check className="h-3.5 w-3.5" />
                            Approved {formatDate(approval.approved_at)}
                          </span>
                        ) : canApprove ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handleBacApprove}
                            disabled={approvingUserId !== null}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {approvingUserId === systemUserId ? (
                              "Approving…"
                            ) : (
                              <>
                                <Check className="mr-1.5 h-3.5 w-3.5" />
                                Approve
                              </>
                            )}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Pending
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        {(ppmp.remarks as PPMPRemark[] | undefined)?.length ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
            <h3 className="mb-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
              PPMP Remarks
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {(ppmp.remarks as PPMPRemark[]).map((r, idx) => (
                <li key={idx} className="flex flex-col gap-0.5">
                  <span>
                    <span className="font-medium text-foreground">
                      {r.role === "unit_head"
                        ? "Unit Head"
                        : r.role === "budget_officer"
                          ? "Budget Officer"
                          : r.role === "bac"
                            ? "BAC"
                            : r.role === "hope"
                              ? "HOPE"
                              : (r.role ?? "Reviewer")}
                      :
                    </span>{" "}
                    {r.text}
                  </span>
                  {r.created_at && (
                    <span className="text-xs opacity-70">
                      {formatDate(r.created_at)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {rows.length === 0 ? (
          <div className="app__empty_state">
            <p className="app__empty_state_title">No procurement rows yet</p>
            <p className="app__empty_state_description">
              {ppmp.status === "draft"
                ? "Add procurement project entries using the Add Row button."
                : "This PPMP has no procurement entries."}
            </p>
            {ppmp.status === "draft" && (
              <Button
                variant="green"
                onClick={() => setWizardOpen(true)}
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Row
              </Button>
            )}
          </div>
        ) : (
          <div className="app__table_container">
            <div className="app__table_wrapper">
              <table className="app__table">
                <thead className="app__table_thead">
                  <tr>
                    <th className="app__table_th">Project</th>
                    <th className="app__table_th">Lots / Items</th>
                    <th className="app__table_th">Procurement</th>
                    <th className="app__table_th">Budget & Funding</th>
                    <th className="app__table_th">Remarks</th>
                    {canCreatePR && (
                      <th className="app__table_th_right">PR</th>
                    )}
                    {(ppmp.status === "draft" || canBacSecretariatEditRows) && (
                      <th className="app__table_th_right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="app__table_tbody">
                  {rows.map((row) => (
                    <tr key={row.id} className="app__table_tr">
                      <td className="app__table_td">
                        <div className="space-y-1 text-sm">
                          <span className="block line-clamp-2">
                            {row.general_description || "-"}
                          </span>
                          {row.project_type && (
                            <span className="inline-flex rounded bg-muted px-1.5 py-0.5 text-xs">
                              {PROJECT_TYPE_LABELS[row.project_type] ??
                                row.project_type}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="app__table_td">
                        <LotsItemsCell
                          lots={Array.isArray(row.items) ? row.items : []}
                          itemsInPRs={prItemsByRow.get(row.id) ?? new Set()}
                        />
                      </td>
                      <td className="app__table_td">
                        <span className="block text-xs leading-relaxed">
                          {formatProcurementBlock(row)}
                        </span>
                      </td>
                      <td className="app__table_td">
                        <span className="block text-xs leading-relaxed">
                          {formatBudgetBlock(row)}
                        </span>
                      </td>
                      <td className="app__table_td">
                        <RemarksCell
                          remarks={row.ppmp_row_remarks ?? []}
                          variant="ppmp_row"
                          parentId={row.id}
                          onRemarkAdded={fetchData}
                          canAddRemark={
                            ppmp.status === "draft" || canBacSecretariatEditRows
                          }
                        />
                      </td>
                      {canCreatePR && (
                        <td className="app__table_td_actions">
                          {row.app_status === "approved" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCreatePRRow(row)}
                              className="gap-1.5"
                            >
                              <ClipboardList className="h-4 w-4" />
                              Create PR
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </td>
                      )}
                      {(ppmp.status === "draft" ||
                        canBacSecretariatEditRows) && (
                        <td className="app__table_td_actions">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              >
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingRow(row);
                                  setWizardOpen(true);
                                }}
                                className="cursor-pointer"
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              {ppmp.status === "draft" && (
                                <DropdownMenuItem
                                  onClick={() => handleDeleteRow(row)}
                                  className="cursor-pointer text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Audit Trail - bottom section */}
        <div className="mt-6 rounded-lg border bg-muted/30 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <History className="h-4 w-4 text-muted-foreground" />
            Audit Trail
          </h3>
          {auditLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No actions recorded yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {auditLog.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-col gap-0.5 rounded-md border-l-2 border-muted-foreground/30 bg-background/50 px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-medium text-foreground">
                      {formatAuditAction(entry.action)}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">
                      {entry.from_status &&
                      entry.to_status &&
                      entry.from_status !== entry.to_status
                        ? `${entry.from_status} → ${entry.to_status}`
                        : (entry.to_status ?? entry.action)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>by {entry.user?.name ?? "System"}</span>
                    <span>{formatDate(entry.created_at)}</span>
                  </div>
                  {entry.remarks && (
                    <p className="mt-1 text-xs text-muted-foreground italic">
                      {entry.remarks}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {createPRRow && systemUserId != null && (
        <CreatePRModal
          isOpen={!!createPRRow}
          onClose={() => setCreatePRRow(null)}
          row={createPRRow}
          itemsAlreadyInPRs={prItemsByRow.get(createPRRow.id) ?? new Set()}
          systemUserId={systemUserId}
          onSuccess={fetchData}
        />
      )}

      <AddRowWizardModal
        isOpen={wizardOpen}
        onClose={() => {
          setWizardOpen(false);
          setEditingRow(null);
        }}
        ppmpId={id}
        onSuccess={editingRow ? handleEditRowSuccess : handleAddRowSuccess}
        editData={editingRow}
      />

      <ConfirmationModal
        isOpen={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        onConfirm={handleSubmitToUnitHead}
        message={
          <p className="text-sm text-muted-foreground">
            Submit this PPMP to the Unit Head for review? This will change the
            status from draft to submitted.
          </p>
        }
      />

      <ConfirmationModal
        isOpen={submitToBudgetModalOpen}
        onClose={() => setSubmitToBudgetModalOpen(false)}
        onConfirm={handleSubmitToBudget}
        message={
          <p className="text-sm text-muted-foreground">
            Submit this PPMP to the Budget Officer for review? This will notify
            the Budget Officer.
          </p>
        }
      />

      <ConfirmationModal
        isOpen={submitToHopeModalOpen}
        onClose={() => setSubmitToHopeModalOpen(false)}
        onConfirm={handleSubmitToHope}
        message={
          <p className="text-sm text-muted-foreground">
            Submit this PPMP to HOPE (Schools Division Superintendent) for
            approval?
          </p>
        }
      />

      <ConfirmationModal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        onConfirm={handleApprove}
        message={
          <p className="text-sm text-muted-foreground">
            Approve this PPMP? This will change the status to approved_by_hope.
          </p>
        }
      />

      <Dialog
        open={returnModalOpen}
        onOpenChange={(open) => {
          setReturnModalOpen(open);
          if (!open) {
            setReturnRemarks("");
            setReturnAction(null);
          }
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              {returnAction === "returned"
                ? "Return PPMP to Creator"
                : returnAction === "returned_to_unit_head"
                  ? "Return PPMP to Unit Head"
                  : returnAction === "returned_to_budget"
                    ? "Return PPMP to Budget"
                    : "Return PPMP"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Remarks are required when returning a PPMP. Explain what should be
              addressed.
            </p>
          </DialogHeader>
          <div className="space-y-2">
            <label
              htmlFor="return-remarks"
              className="text-sm font-medium text-foreground"
            >
              Remarks <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="return-remarks"
              value={returnRemarks}
              onChange={(e) => setReturnRemarks(e.target.value)}
              placeholder="e.g. Please revise Lot 1 budget estimates..."
              rows={4}
              className="resize-none"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setReturnModalOpen(false);
                setReturnRemarks("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleReturn}
              disabled={!returnRemarks.trim()}
            >
              {returnAction === "returned"
                ? "Return to Proponent"
                : returnAction === "returned_to_unit_head"
                  ? "Return to Unit Head"
                  : returnAction === "returned_to_budget"
                    ? "Return to Budget"
                    : "Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
