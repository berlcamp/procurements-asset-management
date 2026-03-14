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
  BID_EVALUATION_STEP_KEYS,
} from "@/lib/constants";
import { advanceToNoticeOfAward } from "@/lib/procurement/workflow";
import { supabase } from "@/lib/supabase/client";
import type { PurchaseRequest } from "@/types/database";
import { ExternalLink, ListCheck, MoreVertical, Scale } from "lucide-react";
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

export default function BidEvaluationPage() {
  const [prs, setPrs] = useState<PRWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluationModalOpen, setEvaluationModalOpen] = useState(false);
  const [recordResultModalOpen, setRecordResultModalOpen] = useState(false);
  const [prForAction, setPrForAction] = useState<PRWithContext | null>(null);
  const [numBidders, setNumBidders] = useState("");
  const [lowestBid, setLowestBid] = useState("");
  const [evaluationStatus, setEvaluationStatus] = useState("");

  const fetchData = useCallback(async () => {
    const { data, error } = await supabase
      .from("purchase_requests")
      .select(
        "*, creator:users!created_by(id, name), ppmp_row:ppmp_rows!ppmp_row_id(id, general_description, ppmp_id, ppmp:ppmp!ppmp_id(fiscal_year, school_id, office_id, school:schools!school_id(id, name), office:offices!office_id(id, name)))"
      )
      .in("current_step_key", [...BID_EVALUATION_STEP_KEYS])
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

  const resetEvaluationForm = useCallback(() => {
    setNumBidders("");
    setLowestBid("");
    setEvaluationStatus("");
    setPrForAction(null);
  }, []);

  const handleRecordEvaluation = useCallback(async () => {
    if (!prForAction) return;
    const num = parseInt(numBidders, 10);
    const bid = lowestBid ? parseFloat(lowestBid.replace(/[^0-9.-]/g, "")) : null;
    const { error } = await supabase
      .from("purchase_requests")
      .update({
        num_bidders: isNaN(num) ? null : num,
        lowest_bid: bid,
        evaluation_status: evaluationStatus || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", prForAction.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEvaluationModalOpen(false);
    resetEvaluationForm();
    toast.success("Evaluation recorded");
    void fetchData();
  }, [prForAction, numBidders, lowestBid, evaluationStatus, resetEvaluationForm, fetchData]);

  const handleSelectWinner = useCallback(async () => {
    if (!prForAction) return;
    try {
      await advanceToNoticeOfAward(prForAction.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to advance step");
      return;
    }
    setRecordResultModalOpen(false);
    setPrForAction(null);
    toast.success("PR moved to Notice of Award");
    void fetchData();
  }, [prForAction, fetchData]);

  return (
    <div>
      <div className="app__title">
        <h1 className="app__title_text flex items-center gap-2">
          <ListCheck className="h-5 w-5" />
          Bid Evaluation
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
              <ListCheck className="mx-auto h-12 w-12 text-muted-foreground" />
            </div>
            <p className="app__empty_state_title">No RFQs to evaluate</p>
            <p className="app__empty_state_description">
              No procurements at Bid Evaluation for fiscal year{" "}
              {CURRENT_FISCAL_YEAR}. Record submissions on the RFQ / Bidding
              page first.
            </p>
            <Button variant="green" className="mt-4" asChild>
              <Link href="/procurement-execution/rfq-bidding">
                View RFQ / Bidding
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
                    <th className="app__table_th">RFQ No</th>
                    <th className="app__table_th">Number of Bidders</th>
                    <th className="app__table_th">Lowest Bid</th>
                    <th className="app__table_th">Evaluation Status</th>
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
                      <td className="app__table_td">{pr.rfq_no || "-"}</td>
                      <td className="app__table_td tabular-nums">
                        {pr.num_bidders != null ? pr.num_bidders : "-"}
                      </td>
                      <td className="app__table_td tabular-nums">
                        {formatAmount(pr.lowest_bid)}
                      </td>
                      <td className="app__table_td">
                        {pr.evaluation_status || "-"}
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
                                setNumBidders(
                                  pr.num_bidders != null
                                    ? String(pr.num_bidders)
                                    : ""
                                );
                                setLowestBid(
                                  pr.lowest_bid != null
                                    ? String(pr.lowest_bid)
                                    : ""
                                );
                                setEvaluationStatus(
                                  pr.evaluation_status || ""
                                );
                                setEvaluationModalOpen(true);
                              }}
                              className="cursor-pointer"
                            >
                              <Scale className="mr-2 h-4 w-4" />
                              Record Evaluation
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setPrForAction(pr);
                                setRecordResultModalOpen(true);
                              }}
                              className="cursor-pointer"
                            >
                              <ListCheck className="mr-2 h-4 w-4" />
                              Select Winning Supplier
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
        open={evaluationModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEvaluationModalOpen(false);
            resetEvaluationForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Evaluation</DialogTitle>
            <DialogDescription>
              Enter number of bidders, lowest bid, and evaluation status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="num-bidders">Number of Bidders</Label>
              <Input
                id="num-bidders"
                type="number"
                min={0}
                value={numBidders}
                onChange={(e) => setNumBidders(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lowest-bid">Lowest Bid (₱)</Label>
              <Input
                id="lowest-bid"
                type="number"
                min={0}
                step={0.01}
                value={lowestBid}
                onChange={(e) => setLowestBid(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evaluation-status">Evaluation Status</Label>
              <Input
                id="evaluation-status"
                value={evaluationStatus}
                onChange={(e) => setEvaluationStatus(e.target.value)}
                placeholder="e.g. Passed, Pending review"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEvaluationModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="green" onClick={handleRecordEvaluation}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationModal
        isOpen={recordResultModalOpen}
        onClose={() => {
          setRecordResultModalOpen(false);
          setPrForAction(null);
        }}
        onConfirm={handleSelectWinner}
        message={
          <p className="text-sm text-muted-foreground">
            Select the winning supplier and move this PR to Notice of Award? You
            will enter supplier and amount on the Notice of Award page.
          </p>
        }
      />
    </div>
  );
}
