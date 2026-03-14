"use client";

import { ConfirmationModal } from "@/components/ConfirmationModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { TableSkeleton } from "@/components/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CURRENT_FISCAL_YEAR } from "@/lib/constants";
import { supabase } from "@/lib/supabase/client";
import type { PurchaseRequest } from "@/types/database";
import {
  ExternalLink,
  Package,
  MoreVertical,
  FileText,
  Send,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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

function formatAmount(val: number | null | undefined): string {
  if (val == null) return "-";
  return `₱${Number(val).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

export default function PurchaseOrdersPage() {
  const [prs, setPrs] = useState<PRWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [deliveryDateModalOpen, setDeliveryDateModalOpen] = useState(false);
  const [releaseModalOpen, setReleaseModalOpen] = useState(false);
  const [prForAction, setPrForAction] = useState<PRWithContext | null>(null);
  const [deliveryDate, setDeliveryDate] = useState("");

  const fetchData = useCallback(async () => {
    const { data, error } = await supabase
      .from("purchase_requests")
      .select(
        "*, creator:users!created_by(id, name), ppmp_row:ppmp_rows!ppmp_row_id(id, general_description, ppmp_id, ppmp:ppmp!ppmp_id(fiscal_year, school_id, office_id, school:schools!school_id(id, name), office:offices!office_id(id, name)))"
      )
      .eq("status", "for_purchase_order")
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

  const handleSetDeliveryDate = useCallback(async () => {
    if (!prForAction || !deliveryDate) return;
    const { error } = await supabase
      .from("purchase_requests")
      .update({
        delivery_date: deliveryDate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", prForAction.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDeliveryDateModalOpen(false);
    setPrForAction(null);
    setDeliveryDate("");
    toast.success("Delivery date recorded");
    void fetchData();
  }, [prForAction, deliveryDate, fetchData]);

  const handleReleasePO = useCallback(async () => {
    if (!prForAction) return;
    const { error } = await supabase
      .from("purchase_requests")
      .update({
        status: "po_released",
        updated_at: new Date().toISOString(),
      })
      .eq("id", prForAction.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setReleaseModalOpen(false);
    setPrForAction(null);
    toast.success("PO release recorded");
    void fetchData();
  }, [prForAction, fetchData]);

  return (
    <div>
      <div className="app__title">
        <h1 className="app__title_text flex items-center gap-2">
          <Package className="h-5 w-5" />
          Purchase Orders
        </h1>
        <div className="app__title_actions">
          <span className="text-sm text-muted-foreground">
            FY {CURRENT_FISCAL_YEAR}
          </span>
        </div>
      </div>
      <div className="app__content">
        {loading ? (
          <TableSkeleton />
        ) : prs.length === 0 ? (
          <div className="app__empty_state">
            <div className="app__empty_state_icon">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
            </div>
            <p className="app__empty_state_title">No purchase orders</p>
            <p className="app__empty_state_description">
              No awarded procurements awaiting PO for fiscal year{" "}
              {CURRENT_FISCAL_YEAR}. Confirm supplier acceptance on the Notice
              of Award page first.
            </p>
            <Button variant="green" className="mt-4" asChild>
              <Link href="/procurement-execution/notice-of-award">
                View Notice of Award
              </Link>
            </Button>
          </div>
        ) : (
          <div className="app__table_container">
            <div className="app__table_wrapper">
              <table className="app__table">
                <thead className="app__table_thead">
                  <tr>
                    <th className="app__table_th">PR No</th>
                    <th className="app__table_th">Supplier</th>
                    <th className="app__table_th">Amount</th>
                    <th className="app__table_th">Delivery Date</th>
                    <th className="app__table_th">Creator / End User</th>
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
                      <td className="app__table_td">{pr.supplier || "-"}</td>
                      <td className="app__table_td tabular-nums font-medium">
                        {formatAmount(pr.award_amount)}
                      </td>
                      <td className="app__table_td text-sm text-muted-foreground">
                        {formatDate(pr.delivery_date)}
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
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem
                              onClick={() => {
                                setPrForAction(pr);
                                setDeliveryDate(
                                  pr.delivery_date
                                    ? pr.delivery_date.slice(0, 10)
                                    : ""
                                );
                                setDeliveryDateModalOpen(true);
                              }}
                              className="cursor-pointer"
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Set Delivery Date
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setPrForAction(pr);
                                setReleaseModalOpen(true);
                              }}
                              className="cursor-pointer"
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Release PO
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/planning/ppmp/${pr.ppmp_row?.ppmp_id ?? ""}`}
                                className="flex cursor-pointer items-center"
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View PPMP
                              </Link>
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
        open={deliveryDateModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeliveryDateModalOpen(false);
            setPrForAction(null);
            setDeliveryDate("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Delivery Date</DialogTitle>
            <DialogDescription>
              Enter the expected delivery date for the Purchase Order.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delivery-date">Delivery Date</Label>
              <Input
                id="delivery-date"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeliveryDateModalOpen(false);
                setPrForAction(null);
                setDeliveryDate("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="green"
              onClick={handleSetDeliveryDate}
              disabled={!deliveryDate}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationModal
        isOpen={releaseModalOpen}
        onClose={() => {
          setReleaseModalOpen(false);
          setPrForAction(null);
        }}
        onConfirm={handleReleasePO}
        message={
          <p className="text-sm text-muted-foreground">
            Confirm that the Purchase Order has been generated, budget
            obligation recorded, accounting verified, and PO released?
          </p>
        }
      />
    </div>
  );
}
