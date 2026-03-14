"use client";

import { ConfirmationModal } from "@/components/ConfirmationModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/TableSkeleton";
import { Button } from "@/components/ui/button";
import {
  canApproveHope,
  canCertifyFunds,
  canMarkForProcurement,
  CURRENT_FISCAL_YEAR,
  formatPRStatusLabel,
  getPRStatusBadgeClass,
} from "@/lib/constants";
import { useAppSelector } from "@/lib/redux/hook";
import { supabase } from "@/lib/supabase/client";
import type {
  PurchaseRequest,
  PurchaseRequestItem,
} from "@/types/database";
import { Check, ClipboardList, ExternalLink, FileCheck, List, MoreVertical } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type PRWithContext = PurchaseRequest & {
  creator?: { id: number; name: string } | null;
  ppmp_row?: {
    id: number;
    general_description: string | null;
    ppmp_id: number;
    ppmp?: {
      fiscal_year: number;
      school_id: number | null;
      office_id: number | null;
      school?: { id: number; name: string } | null;
      office?: { id: number; name: string } | null;
    } | null;
  } | null;
};

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

function getEndUserLabel(pr: PRWithContext): string {
  const ppmp = pr.ppmp_row?.ppmp;
  if (!ppmp) return "-";
  if (ppmp.school?.name) return ppmp.school.name;
  if (ppmp.office?.name) return ppmp.office.name;
  return "-";
}

function PRItemsTableSkeleton() {
  return (
    <div className="app__table_container overflow-hidden">
      <table className="app__table">
        <thead className="app__table_thead">
          <tr>
            <th className="app__table_th w-14">Lot</th>
            <th className="app__table_th w-14">Item</th>
            <th className="app__table_th">Description</th>
            <th className="app__table_th w-24 text-right">Qty</th>
            <th className="app__table_th w-20">Unit</th>
            <th className="app__table_th w-32 text-right">Est. Cost</th>
          </tr>
        </thead>
        <tbody className="app__table_tbody">
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className="app__table_tr">
              <td className="app__table_td">
                <Skeleton className="h-4 w-6" />
              </td>
              <td className="app__table_td">
                <Skeleton className="h-4 w-6" />
              </td>
              <td className="app__table_td">
                <Skeleton className="h-4 w-48" />
              </td>
              <td className="app__table_td text-right">
                <Skeleton className="ml-auto h-4 w-12" />
              </td>
              <td className="app__table_td">
                <Skeleton className="h-4 w-8" />
              </td>
              <td className="app__table_td text-right">
                <Skeleton className="ml-auto h-4 w-20" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PRItemsFooter({ items }: { items: PurchaseRequestItem[] }) {
  const totals = useMemo(() => {
    const totalCost = items.reduce(
      (sum, i) => sum + (i.estimated_cost != null ? Number(i.estimated_cost) : 0),
      0
    );
    return { count: items.length, totalCost };
  }, [items]);

  return (
    <div className="flex shrink-0 items-center justify-between gap-4 border-t border-border bg-muted/30 px-4 py-3">
      <span className="text-sm text-muted-foreground">
        {totals.count} item{totals.count !== 1 ? "s" : ""}
      </span>
      <span className="text-sm font-medium tabular-nums">
        Total: ₱{totals.totalCost.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
      </span>
    </div>
  );
}

export default function ProcurementExecutionPurchaseRequestsPage() {
  const user = useAppSelector((state) => state.user.user);
  const systemUserId = user?.system_user_id as number | undefined;
  const [prs, setPrs] = useState<PRWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [prItemsModalOpen, setPrItemsModalOpen] = useState(false);
  const [selectedPrForItems, setSelectedPrForItems] = useState<
    PRWithContext | null
  >(null);
  const [prItems, setPrItems] = useState<PurchaseRequestItem[]>([]);
  const [prItemsLoading, setPrItemsLoading] = useState(false);
  const [certifyModalOpen, setCertifyModalOpen] = useState(false);
  const [approveHopeModalOpen, setApproveHopeModalOpen] = useState(false);
  const [forProcurementModalOpen, setForProcurementModalOpen] = useState(false);
  const [prForAction, setPrForAction] = useState<PRWithContext | null>(null);

  const fetchData = useCallback(async () => {
    const { data, error } = await supabase
      .from("purchase_requests")
      .select(
        "*, creator:users!created_by(id, name), ppmp_row:ppmp_rows!ppmp_row_id(id, general_description, ppmp_id, ppmp:ppmp!ppmp_id(fiscal_year, school_id, office_id, school:schools!school_id(id, name), office:offices!office_id(id, name)))"
      )
      .in("status", ["submitted", "funds_certified", "hope_approved"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setPrs([]);
    } else {
      const allPrs = (data ?? []) as PRWithContext[];
      const filtered = allPrs.filter(
        (pr) => pr.ppmp_row?.ppmp?.fiscal_year === CURRENT_FISCAL_YEAR
      );
      setPrs(filtered);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchPrItems = useCallback(async (prId: number) => {
    setPrItemsLoading(true);
    const { data, error } = await supabase
      .from("purchase_request_items")
      .select("*")
      .eq("purchase_request_id", prId)
      .order("lot_index")
      .order("item_index");
    if (error) {
      console.error(error);
      setPrItems([]);
    } else {
      setPrItems((data ?? []) as PurchaseRequestItem[]);
    }
    setPrItemsLoading(false);
  }, []);

  const handleOpenPrItemsModal = useCallback(
    (pr: PRWithContext) => {
      setSelectedPrForItems(pr);
      setPrItemsModalOpen(true);
      void fetchPrItems(pr.id);
    },
    [fetchPrItems]
  );

  const handleCertifyFunds = useCallback(async () => {
    if (!prForAction || systemUserId == null) return;
    const { error } = await supabase
      .from("purchase_requests")
      .update({
        status: "funds_certified",
        funds_certified_by: systemUserId,
        funds_certified_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", prForAction.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCertifyModalOpen(false);
    setPrForAction(null);
    toast.success("Funds certified");
    void fetchData();
  }, [prForAction, systemUserId, fetchData]);

  const handleApproveHope = useCallback(async () => {
    if (!prForAction || systemUserId == null) return;
    const { error } = await supabase
      .from("purchase_requests")
      .update({
        status: "hope_approved",
        hope_approved_by: systemUserId,
        hope_approved_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", prForAction.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setApproveHopeModalOpen(false);
    setPrForAction(null);
    toast.success("Approved by HoPE");
    void fetchData();
  }, [prForAction, systemUserId, fetchData]);

  const handleForProcurement = useCallback(async () => {
    if (!prForAction || systemUserId == null) return;
    const { error } = await supabase
      .from("purchase_requests")
      .update({
        status: "for_procurement",
        for_procurement_by: systemUserId,
        for_procurement_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", prForAction.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setForProcurementModalOpen(false);
    setPrForAction(null);
    toast.success("PR marked for procurement");
    void fetchData();
  }, [prForAction, systemUserId, fetchData]);

  return (
    <div>
      <div className="app__title">
        <h1 className="app__title_text flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Purchase Requests
        </h1>
        <div className="app__title_actions">
          <span className="text-sm text-muted-foreground">
            FY {CURRENT_FISCAL_YEAR} — All users
          </span>
        </div>
      </div>
      <div className="app__content">
        {loading ? (
          <TableSkeleton />
        ) : prs.length === 0 ? (
          <div className="app__empty_state">
            <div className="app__empty_state_icon">
              <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground" />
            </div>
            <p className="app__empty_state_title">No purchase requests</p>
            <p className="app__empty_state_description">
              No submitted, funds-certified, or HoPE-approved purchase requests
              for fiscal year {CURRENT_FISCAL_YEAR}.
            </p>
          </div>
        ) : (
          <div className="app__table_container">
            <div className="app__table_wrapper">
              <table className="app__table">
                <thead className="app__table_thead">
                  <tr>
                    <th className="app__table_th">PR #</th>
                    <th className="app__table_th">PPMP FY</th>
                    <th className="app__table_th">Creator / End User</th>
                    <th className="app__table_th">Project</th>
                    <th className="app__table_th">Status</th>
                    <th className="app__table_th">Created</th>
                    <th className="app__table_th_right">Actions</th>
                  </tr>
                </thead>
                <tbody className="app__table_tbody">
                  {prs.map((pr) => (
                    <tr key={pr.id} className="app__table_tr">
                      <td className="app__table_td">
                        <span className="font-medium">
                          {pr.reference_number || `PR-${pr.id}`}
                        </span>
                      </td>
                      <td className="app__table_td">
                        FY{pr.ppmp_row?.ppmp?.fiscal_year ?? "-"}
                      </td>
                      <td className="app__table_td">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">
                            {pr.creator?.name ?? "-"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {getEndUserLabel(pr)}
                          </span>
                        </div>
                      </td>
                      <td className="app__table_td">
                        <span className="line-clamp-2 text-sm">
                          {pr.ppmp_row?.general_description || "-"}
                        </span>
                      </td>
                      <td className="app__table_td">
                        <span
                          className={getPRStatusBadgeClass(pr.status)}
                          title={formatPRStatusLabel(pr.status)}
                        >
                          {formatPRStatusLabel(pr.status)}
                        </span>
                      </td>
                      <td className="app__table_td text-sm text-muted-foreground">
                        {formatDate(pr.created_at)}
                      </td>
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
                          <DropdownMenuContent align="end" className="w-52">
                            {canCertifyFunds(user?.type, pr.status) && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setPrForAction(pr);
                                  setCertifyModalOpen(true);
                                }}
                                className="cursor-pointer"
                              >
                                <FileCheck className="mr-2 h-4 w-4" />
                                Certify Fund Available
                              </DropdownMenuItem>
                            )}
                            {canApproveHope(user?.type, pr.status) && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setPrForAction(pr);
                                  setApproveHopeModalOpen(true);
                                }}
                                className="cursor-pointer"
                              >
                                <Check className="mr-2 h-4 w-4" />
                                Approve (HoPE)
                              </DropdownMenuItem>
                            )}
                            {canMarkForProcurement(user?.type, pr.status) && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setPrForAction(pr);
                                  setForProcurementModalOpen(true);
                                }}
                                className="cursor-pointer"
                              >
                                <FileCheck className="mr-2 h-4 w-4" />
                                For Procurement
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/planning/ppmp/${pr.ppmp_row?.ppmp_id ?? ""}`}
                                className="flex cursor-pointer items-center"
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View PPMP
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleOpenPrItemsModal(pr)}
                              className="cursor-pointer"
                            >
                              <List className="mr-2 h-4 w-4" />
                              View PR items
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={prItemsModalOpen}
        onOpenChange={(open) => {
          setPrItemsModalOpen(open);
          if (!open) {
            setSelectedPrForItems(null);
            setPrItems([]);
          }
        }}
      >
        <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden sm:max-w-2xl">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              PR Items
              {selectedPrForItems && (
                <span className="font-mono font-normal text-muted-foreground">
                  {selectedPrForItems.reference_number ||
                    `PR-${selectedPrForItems.id}`}
                </span>
              )}
            </DialogTitle>
            {selectedPrForItems && (
              <DialogDescription>
                <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span>
                    FY {selectedPrForItems.ppmp_row?.ppmp?.fiscal_year ?? "-"}
                  </span>
                  <span>•</span>
                  <span>{getEndUserLabel(selectedPrForItems)}</span>
                  <span>•</span>
                  <span className="capitalize">
                    {formatPRStatusLabel(selectedPrForItems.status)}
                  </span>
                </span>
              </DialogDescription>
            )}
          </DialogHeader>

          {prItemsLoading ? (
            <PRItemsTableSkeleton />
          ) : prItems.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 py-16">
              <div className="rounded-full bg-muted p-4">
                <List className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="mt-4 font-medium text-foreground">
                No items in this purchase request
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add items from the PPMP details page
              </p>
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-auto">
                <div className="app__table_container">
                  <table className="app__table">
                    <thead className="app__table_thead sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                      <tr>
                        <th className="app__table_th w-14">Lot</th>
                        <th className="app__table_th w-14">Item</th>
                        <th className="app__table_th min-w-[200px]">
                          Description
                        </th>
                        <th className="app__table_th w-24 text-right">
                          Qty
                        </th>
                        <th className="app__table_th w-20">Unit</th>
                        <th className="app__table_th w-32 text-right">
                          Est. Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody className="app__table_tbody">
                      {prItems.map((item) => (
                        <tr key={item.id} className="app__table_tr">
                          <td className="app__table_td text-muted-foreground">
                            {item.lot_index + 1}
                          </td>
                          <td className="app__table_td text-muted-foreground">
                            {item.item_index + 1}
                          </td>
                          <td className="app__table_td">
                            <span className="line-clamp-2 text-sm">
                              {item.description || "—"}
                            </span>
                          </td>
                          <td className="app__table_td text-right tabular-nums">
                            {item.quantity != null
                              ? Number(item.quantity).toLocaleString()
                              : "—"}
                          </td>
                          <td className="app__table_td text-muted-foreground">
                            {item.unit || "—"}
                          </td>
                          <td className="app__table_td text-right tabular-nums font-medium">
                            {item.estimated_cost != null
                              ? `₱${Number(item.estimated_cost).toLocaleString("en-PH", {
                                  minimumFractionDigits: 2,
                                })}`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <PRItemsFooter items={prItems} />
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmationModal
        isOpen={certifyModalOpen}
        onClose={() => {
          setCertifyModalOpen(false);
          setPrForAction(null);
        }}
        onConfirm={handleCertifyFunds}
        message={
          <p className="text-sm text-muted-foreground">
            Certify that funds are available for this Purchase Request? This will
            record your certification and change the status to Funds Certified.
          </p>
        }
      />
      <ConfirmationModal
        isOpen={approveHopeModalOpen}
        onClose={() => {
          setApproveHopeModalOpen(false);
          setPrForAction(null);
        }}
        onConfirm={handleApproveHope}
        message={
          <p className="text-sm text-muted-foreground">
            Approve this Purchase Request as HoPE (Schools Division
            Superintendent)? This will change the status to HoPE Approved.
          </p>
        }
      />
      <ConfirmationModal
        isOpen={forProcurementModalOpen}
        onClose={() => {
          setForProcurementModalOpen(false);
          setPrForAction(null);
        }}
        onConfirm={handleForProcurement}
        message={
          <p className="text-sm text-muted-foreground">
            Mark this Purchase Request for Procurement? It will move to the
            Pre-Procurement page for the BAC to process.
          </p>
        }
      />
    </div>
  );
}
