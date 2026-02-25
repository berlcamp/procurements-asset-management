"use client";

import { ConfirmationModal } from "@/components/ConfirmationModal";
import { TableSkeleton } from "@/components/TableSkeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CURRENT_FISCAL_YEAR,
  isBacSecretariat,
  isBacUser,
  isHope,
  PER_PAGE,
} from "@/lib/constants";
import { useAppSelector } from "@/lib/redux/hook";
import { supabase } from "@/lib/supabase/client";
import type {
  App,
  PPMP,
  PPMPRow,
  PPMPRowLot,
  PPMPRowLotItem,
  PPMPRowRemarkRow,
} from "@/types/database";
import {
  Building2,
  Check,
  Clock,
  FileText,
  MoreVertical,
  Pencil,
  School,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { RemarksCell } from "@/components/RemarksCell";
import { AddRowWizardModal } from "../ppmp/AddRowWizardModal";
import { Filter, type APPFilter } from "./Filter";

type PPMPRowWithPpmp = PPMPRow & {
  ppmp?: PPMP | null;
  ppmp_row_remarks?: PPMPRowRemarkRow[];
};

const PROJECT_TYPE_LABELS: Record<string, string> = {
  goods: "Goods",
  infrastructure: "Infrastructure",
  consulting_services: "Consulting Services",
};

function formatItemsDisplay(lots: PPMPRowLot[] | null | undefined): string {
  if (!lots || lots.length === 0) return "-";
  return lots
    .map((lot, lotIdx) => {
      const lotName = lot.name?.trim() || `Lot ${lotIdx + 1}`;
      const items = lot.items ?? [];
      if (items.length === 0) return `${lotName}: (no items)`;
      const itemsStr = items
        .map((item: PPMPRowLotItem) => {
          const desc = item.description?.trim() || "-";
          const qty = item.quantity != null ? item.quantity : "-";
          const unit = item.unit?.trim() || "";
          const cost =
            item.estimated_cost != null
              ? item.estimated_cost.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                })
              : "-";
          return `${desc} (${qty}${unit ? ` ${unit}` : ""}) — PhP ${cost}`;
        })
        .join("; ");
      return `${lotName}: ${itemsStr}`;
    })
    .join(" | ");
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

function getEndUserLabel(row: PPMPRowWithPpmp): string {
  const ppmp = row.ppmp;
  if (!ppmp) return "-";
  if (ppmp.end_user_type === "school" && ppmp.school?.name) {
    return ppmp.school.name;
  }
  if (ppmp.end_user_type === "office" && ppmp.office?.name) {
    return ppmp.office.name;
  }
  return "-";
}

export default function APPPage() {
  const user = useAppSelector((state) => state.user.user);
  const systemUserId = user?.system_user_id as number | undefined;

  const [rows, setRows] = useState<PPMPRowWithPpmp[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<APPFilter>({});
  const [loading, setLoading] = useState(true);
  const [appApproval, setAppApproval] = useState<App | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approvingRowId, setApprovingRowId] = useState<number | null>(null);
  const [rowActionModal, setRowActionModal] = useState<{
    row: PPMPRowWithPpmp;
    action: "approve" | "pending";
  } | null>(null);
  const [markingPendingRowId, setMarkingPendingRowId] = useState<number | null>(
    null,
  );
  const [editingRow, setEditingRow] = useState<PPMPRowWithPpmp | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const canAccess = isHope(user?.type) || isBacUser(user?.type);
  const canApproveRows = isBacUser(user?.type) || isHope(user?.type);
  const canEditRows = isBacSecretariat(user?.type);
  const canApproveAPP = isHope(user?.type);

  const fetchAppApproval = useCallback(async (fy: number) => {
    const { data } = await supabase
      .from("app")
      .select("*")
      .eq("fiscal_year", fy)
      .maybeSingle();
    setAppApproval(data as App | null);
  }, []);

  const fetchData = useCallback(async () => {
    if (!canAccess) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const fiscalYear = filter.fiscalYear ?? CURRENT_FISCAL_YEAR;

    const { data: allPpmpIdsData } = await supabase
      .from("ppmp")
      .select("id")
      .eq("status", "approved_by_hope")
      .eq("fiscal_year", fiscalYear);
    const allPpmpIds = (allPpmpIdsData ?? []).map((p: { id: number }) => p.id);

    let ppmpIds = allPpmpIds;
    if (filter.endUserType) {
      const { data: filteredData } = await supabase
        .from("ppmp")
        .select("id")
        .eq("status", "approved_by_hope")
        .eq("fiscal_year", fiscalYear)
        .eq("end_user_type", filter.endUserType);
      ppmpIds = (filteredData ?? []).map((p: { id: number }) => p.id);
    }

    const { count: pending } = await supabase
      .from("ppmp_rows")
      .select("*", { count: "exact", head: true })
      .in("ppmp_id", allPpmpIds)
      .eq("app_status", "pending");
    setPendingCount(pending ?? 0);

    if (ppmpIds.length === 0) {
      setRows([]);
      setTotalCount(0);
      setLoading(false);
      await fetchAppApproval(fiscalYear);
      return;
    }

    let query = supabase
      .from("ppmp_rows")
      .select(
        "*, ppmp:ppmp_id(fiscal_year, status, end_user_type, school_id, office_id, school:schools(id, name), office:offices(id, name)), ppmp_row_remarks(id, text, role, created_at)",
        { count: "exact" },
      )
      .in("ppmp_id", ppmpIds);

    if (filter.keyword?.trim()) {
      const kw = filter.keyword.trim();
      query = query.or(
        `general_description.ilike.%${kw}%,source_of_funds.ilike.%${kw}%`,
      );
    }
    if (filter.appStatus) {
      query = query.eq("app_status", filter.appStatus);
    }

    const { data, count, error } = await query
      .range((page - 1) * PER_PAGE, page * PER_PAGE - 1)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      toast.error("Failed to load APP rows");
      setRows([]);
      setTotalCount(0);
    } else {
      const rowsWithPpmp = (data ?? []).map((r) => ({
        ...r,
        app_status: (r.app_status as "pending" | "approved") || "pending",
      })) as PPMPRowWithPpmp[];
      setRows(rowsWithPpmp);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
    await fetchAppApproval(fiscalYear);
  }, [
    canAccess,
    filter.fiscalYear,
    filter.endUserType,
    filter.keyword,
    filter.appStatus,
    page,
    fetchAppApproval,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fiscalYear = filter.fiscalYear ?? CURRENT_FISCAL_YEAR;
  const appAlreadyApproved = appApproval?.approved_at != null;
  const appApprovalButtonEnabled =
    canApproveAPP &&
    !appAlreadyApproved &&
    totalCount > 0 &&
    pendingCount === 0;

  const handleApproveRow = async (row: PPMPRowWithPpmp) => {
    if (!canApproveRows) return;
    setApprovingRowId(row.id);
    const { error } = await supabase
      .from("ppmp_rows")
      .update({ app_status: "approved", updated_at: new Date().toISOString() })
      .eq("id", row.id);
    setApprovingRowId(null);
    if (error) {
      toast.error(error.message);
    } else {
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, app_status: "approved" as const } : r,
        ),
      );
      setPendingCount((c) => Math.max(0, c - 1));
      toast.success("Row approved");
    }
  };

  const handleMarkPendingRow = async (row: PPMPRowWithPpmp) => {
    if (!canApproveRows) return;
    setMarkingPendingRowId(row.id);
    const { error } = await supabase
      .from("ppmp_rows")
      .update({ app_status: "pending", updated_at: new Date().toISOString() })
      .eq("id", row.id);
    setMarkingPendingRowId(null);
    if (error) {
      toast.error(error.message);
    } else {
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, app_status: "pending" as const } : r,
        ),
      );
      setPendingCount((c) => c + 1);
      toast.success("Row marked as pending");
    }
  };

  const handleApproveAPP = async () => {
    if (!canApproveAPP || !systemUserId || appAlreadyApproved) return;
    const { error } = await supabase.from("app").upsert(
      {
        fiscal_year: fiscalYear,
        approved_at: new Date().toISOString(),
        approved_by_user_id: systemUserId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "fiscal_year" },
    );
    if (error) {
      toast.error(error.message);
      throw error;
    }
    setAppApproval({
      fiscal_year: fiscalYear,
      approved_at: new Date().toISOString(),
      approved_by_user_id: systemUserId,
      created_at: "",
      updated_at: "",
    });
    toast.success("APP approved successfully");
  };

  const handleEditSuccess = (updated: PPMPRow) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === updated.id
          ? {
              ...r,
              ...updated,
              ppmp_row_remarks: r.ppmp_row_remarks ?? [],
            }
          : r,
      ),
    );
    setEditModalOpen(false);
    setEditingRow(null);
  };

  const handleFilterChange = useCallback((newFilter: APPFilter) => {
    setFilter(newFilter);
    setPage(1);
  }, []);

  if (!canAccess) {
    return (
      <div>
        <div className="app__title">
          <h1 className="app__title_text flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Annual Procurement Plan (APP)
          </h1>
        </div>
        <div className="app__content">
          <div className="app__empty_state">
            <div className="app__empty_state_icon">
              <FileText className="mx-auto h-12 w-12" />
            </div>
            <p className="app__empty_state_title">Access restricted</p>
            <p className="app__empty_state_description">
              Only HOPE and BAC members can view and manage the APP.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading && rows.length === 0) {
    return (
      <div className="app__content">
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div>
      <div className="app__title">
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="app__title_text flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Annual Procurement Plan (APP)
              {appAlreadyApproved && (
                <span className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1 text-sm font-medium text-white">
                  Approved
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Procurement rows from HOPE-approved PPMPs for FY {fiscalYear}. BAC
              approves each row; HOPE approves the full APP when ready.
            </p>
          </div>
          <div className="app__title_actions flex flex-wrap items-center gap-2">
            <Filter filter={filter} setFilter={handleFilterChange} />
            {canApproveAPP && (
              <Button
                variant="green"
                size="sm"
                onClick={() => setApproveModalOpen(true)}
                disabled={!appApprovalButtonEnabled}
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                APP Approval
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="app__content">
        {rows.length === 0 ? (
          <div className="app__empty_state">
            <div className="app__empty_state_icon">
              <FileText className="mx-auto h-12 w-12" />
            </div>
            <p className="app__empty_state_title">No APP rows</p>
            <p className="app__empty_state_description">
              {(filter.keyword ?? filter.appStatus ?? filter.endUserType)
                ? "No rows match your filters. Try adjusting them."
                : "There are no HOPE-approved PPMPs for this fiscal year yet."}
            </p>
          </div>
        ) : (
          <div className="app__table_container">
            <div className="app__table_wrapper">
              <table className="app__table">
                <thead className="app__table_thead">
                  <tr>
                    <th className="app__table_th">End User</th>
                    <th className="app__table_th">Project</th>
                    <th className="app__table_th">Lots / Items</th>
                    <th className="app__table_th">Procurement</th>
                    <th className="app__table_th">Budget</th>
                    <th className="app__table_th">Remarks</th>
                    <th className="app__table_th">APP Status</th>
                    {canEditRows && (
                      <th className="app__table_th_right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="app__table_tbody">
                  {rows.map((row) => (
                    <tr key={row.id} className="app__table_tr">
                      <td className="app__table_td">
                        <div className="space-y-1">
                          <span className="block font-medium text-sm">
                            {getEndUserLabel(row)}
                          </span>
                          {row.ppmp?.end_user_type && (
                            <span
                              className={`inline-flex w-fit items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                                row.ppmp.end_user_type === "school"
                                  ? "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-800"
                                  : "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800"
                              }`}
                            >
                              {row.ppmp.end_user_type === "school" ? (
                                <School className="h-3.5 w-3.5" />
                              ) : (
                                <Building2 className="h-3.5 w-3.5" />
                              )}
                              {row.ppmp.end_user_type === "school"
                                ? "School"
                                : "Office"}
                            </span>
                          )}
                        </div>
                      </td>
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
                        <span className="block text-xs leading-relaxed">
                          {formatItemsDisplay(
                            Array.isArray(row.items) ? row.items : [],
                          )}
                        </span>
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
                          canAddRemark={canApproveRows}
                        />
                      </td>
                      <td className="app__table_td">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              (row.app_status ?? "pending") === "approved"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                            }`}
                          >
                            {(row.app_status ?? "pending") === "approved"
                              ? "Approved"
                              : "Pending"}
                          </span>
                          {canApproveRows &&
                            (row.app_status ?? "pending") === "pending" && (
                              <Button
                                size="xxs"
                                variant="green"
                                onClick={() =>
                                  setRowActionModal({ row, action: "approve" })
                                }
                                disabled={approvingRowId === row.id}
                                className="gap-1"
                              >
                                {approvingRowId === row.id ? (
                                  "…"
                                ) : (
                                  <>
                                    <Check className="h-3 w-3" />
                                    Approve
                                  </>
                                )}
                              </Button>
                            )}
                          {canApproveRows &&
                            (row.app_status ?? "pending") === "approved" && (
                              <Button
                                size="xxs"
                                variant="outline"
                                onClick={() =>
                                  setRowActionModal({ row, action: "pending" })
                                }
                                disabled={markingPendingRowId === row.id}
                                className="gap-1"
                              >
                                {markingPendingRowId === row.id ? (
                                  "…"
                                ) : (
                                  <>
                                    <Clock className="h-3 w-3" />
                                    Mark as Pending
                                  </>
                                )}
                              </Button>
                            )}
                        </div>
                      </td>
                      {canEditRows && (
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
                                  if (
                                    (row.app_status ?? "pending") !== "pending"
                                  )
                                    return;
                                  setEditingRow(row);
                                  setEditModalOpen(true);
                                }}
                                disabled={
                                  (row.app_status ?? "pending") !== "pending"
                                }
                                className="cursor-pointer"
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
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

        {totalCount > 0 && totalCount > PER_PAGE && (
          <div className="app__pagination">
            <div className="app__pagination_info">
              Page <span className="font-medium">{page}</span> of{" "}
              <span className="font-medium">
                {Math.ceil(totalCount / PER_PAGE)}
              </span>
            </div>
            <div className="app__pagination_controls">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={page === 1 || loading}
                className="h-9 min-w-[80px]"
              >
                Previous
              </Button>
              <div className="app__pagination_page_numbers">
                {Array.from(
                  { length: Math.min(5, Math.ceil(totalCount / PER_PAGE)) },
                  (_, i) => {
                    const totalPages = Math.ceil(totalCount / PER_PAGE);
                    const pageNum =
                      totalPages <= 5
                        ? i + 1
                        : page <= 3
                          ? i + 1
                          : page >= totalPages - 2
                            ? totalPages - 4 + i
                            : page - 2 + i;
                    return (
                      <Button
                        key={pageNum}
                        size="sm"
                        variant={page === pageNum ? "default" : "outline"}
                        onClick={() => setPage(pageNum)}
                        disabled={loading}
                        className="h-9 w-9 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  },
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page * PER_PAGE >= totalCount || loading}
                className="h-9 min-w-[80px]"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        onConfirm={handleApproveAPP}
        message={
          <p className="text-sm text-muted-foreground">
            Approve the entire Annual Procurement Plan for FY {fiscalYear}? This
            confirms all rows have been reviewed by BAC.
          </p>
        }
      />

      <ConfirmationModal
        isOpen={rowActionModal != null}
        onClose={() => setRowActionModal(null)}
        onConfirm={async () => {
          if (!rowActionModal) return;
          if (rowActionModal.action === "approve") {
            await handleApproveRow(rowActionModal.row);
          } else {
            await handleMarkPendingRow(rowActionModal.row);
          }
        }}
        message={
          rowActionModal ? (
            <p className="text-sm text-muted-foreground">
              {rowActionModal.action === "approve" ? (
                <>
                  Are you sure you want to approve this procurement row? It will
                  be marked as approved in the APP.
                </>
              ) : (
                <>
                  Are you sure you want to mark this row as pending? It will
                  need to be approved again before the APP can be finalized.
                </>
              )}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground" />
          )
        }
      />

      {editingRow && editingRow.ppmp_id && (
        <AddRowWizardModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditingRow(null);
          }}
          ppmpId={editingRow.ppmp_id}
          onSuccess={handleEditSuccess}
          editData={editingRow}
        />
      )}
    </div>
  );
}
