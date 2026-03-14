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
  RFQ_BIDDING_STEP_KEYS,
} from "@/lib/constants";
import { advanceStep } from "@/lib/procurement/workflow";
import { supabase } from "@/lib/supabase/client";
import type { PurchaseRequest } from "@/types/database";
import {
  ExternalLink,
  Gavel,
  FileText,
  MoreVertical,
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

export default function RfqBiddingPage() {
  const [prs, setPrs] = useState<PRWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [rfqModalOpen, setRfqModalOpen] = useState(false);
  const [recordSubmissionsModalOpen, setRecordSubmissionsModalOpen] =
    useState(false);
  const [prForAction, setPrForAction] = useState<PRWithContext | null>(null);
  const [rfqNo, setRfqNo] = useState("");
  const [postingDate, setPostingDate] = useState("");
  const [submissionDeadline, setSubmissionDeadline] = useState("");

  const fetchData = useCallback(async () => {
    const { data, error } = await supabase
      .from("purchase_requests")
      .select(
        "*, creator:users!created_by(id, name), ppmp_row:ppmp_rows!ppmp_row_id(id, general_description, ppmp_id, ppmp:ppmp!ppmp_id(fiscal_year, school_id, office_id, school:schools!school_id(id, name), office:offices!office_id(id, name)))"
      )
      .in("current_step_key", [...RFQ_BIDDING_STEP_KEYS])
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

  const resetRfqForm = useCallback(() => {
    setRfqNo("");
    setPostingDate("");
    setSubmissionDeadline("");
    setPrForAction(null);
  }, []);

  const handleGenerateRfq = useCallback(async () => {
    if (!prForAction || !rfqNo || !postingDate || !submissionDeadline) return;
    const { error } = await supabase
      .from("purchase_requests")
      .update({
        rfq_no: rfqNo,
        posting_date: postingDate,
        submission_deadline: submissionDeadline,
        updated_at: new Date().toISOString(),
      })
      .eq("id", prForAction.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRfqModalOpen(false);
    resetRfqForm();
    toast.success("RFQ recorded");
    void fetchData();
  }, [prForAction, rfqNo, postingDate, submissionDeadline, resetRfqForm, fetchData]);

  const handleRecordSubmissions = useCallback(async () => {
    if (!prForAction) return;
    try {
      await advanceStep(prForAction.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to advance step");
      return;
    }
    setRecordSubmissionsModalOpen(false);
    setPrForAction(null);
    toast.success("PR advanced to next step");
    void fetchData();
  }, [prForAction, fetchData]);

  return (
    <div>
      <div className="app__title">
        <h1 className="app__title_text flex items-center gap-2">
          <Gavel className="h-5 w-5" />
          RFQ / Bidding
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
              <Gavel className="mx-auto h-12 w-12 text-muted-foreground" />
            </div>
            <p className="app__empty_state_title">No procurement activities</p>
            <p className="app__empty_state_description">
              No purchase requests at RFQ/Bidding for fiscal year{" "}
              {CURRENT_FISCAL_YEAR}. Complete pre-procurement first.
            </p>
            <Button variant="green" className="mt-4" asChild>
              <Link href="/procurement-execution/pre-procurement">
                View Pre-Procurement
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
                    <th className="app__table_th">Posting Date</th>
                    <th className="app__table_th">Submission Deadline</th>
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
                        {pr.rfq_no || "-"}
                      </td>
                      <td className="app__table_td text-sm text-muted-foreground">
                        {formatDate(pr.posting_date)}
                      </td>
                      <td className="app__table_td text-sm text-muted-foreground">
                        {formatDate(pr.submission_deadline)}
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
                                setRfqNo(pr.rfq_no || "");
                                setPostingDate(
                                  pr.posting_date
                                    ? pr.posting_date.slice(0, 10)
                                    : ""
                                );
                                setSubmissionDeadline(
                                  pr.submission_deadline
                                    ? pr.submission_deadline.slice(0, 10)
                                    : ""
                                );
                                setRfqModalOpen(true);
                              }}
                              className="cursor-pointer"
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Generate RFQ
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setPrForAction(pr);
                                setRecordSubmissionsModalOpen(true);
                              }}
                              className="cursor-pointer"
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Record Submissions
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
        open={rfqModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRfqModalOpen(false);
            resetRfqForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record RFQ Details</DialogTitle>
            <DialogDescription>
              Enter RFQ number, posting date, and submission deadline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rfq-no">RFQ No</Label>
              <Input
                id="rfq-no"
                value={rfqNo}
                onChange={(e) => setRfqNo(e.target.value)}
                placeholder="e.g. RFQ-2024-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="posting-date">Posting Date</Label>
              <Input
                id="posting-date"
                type="date"
                value={postingDate}
                onChange={(e) => setPostingDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="submission-deadline">Submission Deadline</Label>
              <Input
                id="submission-deadline"
                type="date"
                value={submissionDeadline}
                onChange={(e) => setSubmissionDeadline(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRfqModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="green"
              onClick={handleGenerateRfq}
              disabled={!rfqNo || !postingDate || !submissionDeadline}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationModal
        isOpen={recordSubmissionsModalOpen}
        onClose={() => {
          setRecordSubmissionsModalOpen(false);
          setPrForAction(null);
        }}
        onConfirm={handleRecordSubmissions}
        message={
          <p className="text-sm text-muted-foreground">
            Record that quotations have been submitted? This will move the PR to
            the Bid Evaluation page.
          </p>
        }
      />
    </div>
  );
}
