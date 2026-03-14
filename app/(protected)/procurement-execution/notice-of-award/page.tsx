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
import {
  CURRENT_FISCAL_YEAR,
  NOTICE_OF_AWARD_STEP_KEYS,
} from "@/lib/constants";
import { advanceStep } from "@/lib/procurement/workflow";
import { supabase } from "@/lib/supabase/client";
import type { PurchaseRequest } from "@/types/database";
import { Award, ExternalLink, FileText, MoreVertical, Check } from "lucide-react";
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

export default function NoticeOfAwardPage() {
  const [prs, setPrs] = useState<PRWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [noaModalOpen, setNoaModalOpen] = useState(false);
  const [acceptanceModalOpen, setAcceptanceModalOpen] = useState(false);
  const [prForAction, setPrForAction] = useState<PRWithContext | null>(null);
  const [supplier, setSupplier] = useState("");
  const [awardAmount, setAwardAmount] = useState("");
  const [noaDate, setNoaDate] = useState("");

  const fetchData = useCallback(async () => {
    const { data, error } = await supabase
      .from("purchase_requests")
      .select(
        "*, creator:users!created_by(id, name), ppmp_row:ppmp_rows!ppmp_row_id(id, general_description, ppmp_id, ppmp:ppmp!ppmp_id(fiscal_year, school_id, office_id, school:schools!school_id(id, name), office:offices!office_id(id, name)))"
      )
      .in("current_step_key", [...NOTICE_OF_AWARD_STEP_KEYS])
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

  const resetNoaForm = useCallback(() => {
    setSupplier("");
    setAwardAmount("");
    setNoaDate("");
    setPrForAction(null);
  }, []);

  const handleGenerateNoa = useCallback(async () => {
    if (!prForAction || !supplier || !awardAmount || !noaDate) return;
    const amount = parseFloat(awardAmount.replace(/[^0-9.-]/g, ""));
    const { error } = await supabase
      .from("purchase_requests")
      .update({
        supplier,
        award_amount: isNaN(amount) ? null : amount,
        noa_date: noaDate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", prForAction.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNoaModalOpen(false);
    resetNoaForm();
    toast.success("NOA details recorded");
    void fetchData();
  }, [prForAction, supplier, awardAmount, noaDate, resetNoaForm, fetchData]);

  const handleConfirmAcceptance = useCallback(async () => {
    if (!prForAction) return;
    try {
      await advanceStep(prForAction.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to advance step");
      return;
    }
    setAcceptanceModalOpen(false);
    setPrForAction(null);
    toast.success("PR moved to Purchase Order");
    void fetchData();
  }, [prForAction, fetchData]);

  return (
    <div>
      <div className="app__title">
        <h1 className="app__title_text flex items-center gap-2">
          <Award className="h-5 w-5" />
          Notice of Award
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
              <Award className="mx-auto h-12 w-12 text-muted-foreground" />
            </div>
            <p className="app__empty_state_title">No awards to process</p>
            <p className="app__empty_state_description">
              No procurements at Notice of Award for fiscal year{" "}
              {CURRENT_FISCAL_YEAR}. Select winning suppliers on the Bid
              Evaluation page first.
            </p>
            <Button variant="green" className="mt-4" asChild>
              <Link href="/procurement-execution/bid-evaluation">
                View Bid Evaluation
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
                    <th className="app__table_th">NOA Date</th>
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
                      <td className="app__table_td">
                        {pr.supplier || "-"}
                      </td>
                      <td className="app__table_td tabular-nums font-medium">
                        {formatAmount(pr.award_amount)}
                      </td>
                      <td className="app__table_td text-sm text-muted-foreground">
                        {formatDate(pr.noa_date)}
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
                                setSupplier(pr.supplier || "");
                                setAwardAmount(
                                  pr.award_amount != null
                                    ? String(pr.award_amount)
                                    : ""
                                );
                                setNoaDate(
                                  pr.noa_date
                                    ? pr.noa_date.slice(0, 10)
                                    : ""
                                );
                                setNoaModalOpen(true);
                              }}
                              className="cursor-pointer"
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Generate NOA
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setPrForAction(pr);
                                setAcceptanceModalOpen(true);
                              }}
                              className="cursor-pointer"
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Confirm Supplier Acceptance
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
        open={noaModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setNoaModalOpen(false);
            resetNoaForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Notice of Award</DialogTitle>
            <DialogDescription>
              Enter supplier name, award amount, and NOA date.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Supplier name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="award-amount">Amount (₱)</Label>
              <Input
                id="award-amount"
                type="number"
                min={0}
                step={0.01}
                value={awardAmount}
                onChange={(e) => setAwardAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="noa-date">NOA Date</Label>
              <Input
                id="noa-date"
                type="date"
                value={noaDate}
                onChange={(e) => setNoaDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoaModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="green"
              onClick={handleGenerateNoa}
              disabled={!supplier || !awardAmount || !noaDate}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationModal
        isOpen={acceptanceModalOpen}
        onClose={() => {
          setAcceptanceModalOpen(false);
          setPrForAction(null);
        }}
        onConfirm={handleConfirmAcceptance}
        message={
          <p className="text-sm text-muted-foreground">
            Confirm that the supplier has accepted the Notice of Award? This
            will move the PR to the Purchase Order page.
          </p>
        }
      />
    </div>
  );
}
