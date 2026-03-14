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
  PRE_PROCUREMENT_STEP_KEYS,
} from "@/lib/constants";
import { advanceStep } from "@/lib/procurement/workflow";
import { supabase } from "@/lib/supabase/client";
import type { PurchaseRequest } from "@/types/database";
import { Calendar, ExternalLink, FileSearch, List, MoreVertical } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

type PRWithContext = PurchaseRequest & {
  creator?: { id: number; name: string } | null;
  ppmp_row?: {
    id: number;
    general_description: string | null;
    procurement_mode: string | null;
    estimated_budget: number | null;
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

function formatABC(val: number | null | undefined): string {
  if (val == null) return "-";
  return `₱${Number(val).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

export default function PreProcurementPage() {
  const [prs, setPrs] = useState<PRWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [prForAction, setPrForAction] = useState<PRWithContext | null>(null);
  const [conferenceDate, setConferenceDate] = useState("");

  const fetchData = useCallback(async () => {
    const { data, error } = await supabase
      .from("purchase_requests")
      .select(
        "*, creator:users!created_by(id, name), ppmp_row:ppmp_rows!ppmp_row_id(id, general_description, procurement_mode, estimated_budget, ppmp_id, ppmp:ppmp!ppmp_id(fiscal_year, school_id, office_id, school:schools!school_id(id, name), office:offices!office_id(id, name)))"
      )
      .in("current_step_key", [...PRE_PROCUREMENT_STEP_KEYS])
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

  const handleSchedulePreProcurement = useCallback(async () => {
    if (!prForAction || !conferenceDate) return;
    const { error } = await supabase
      .from("purchase_requests")
      .update({
        conference_date: conferenceDate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", prForAction.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setScheduleModalOpen(false);
    setPrForAction(null);
    setConferenceDate("");
    toast.success("Pre-procurement conference scheduled");
    void fetchData();
  }, [prForAction, conferenceDate, fetchData]);

  const handleCompletePreProcurement = useCallback(async () => {
    if (!prForAction) return;
    try {
      await advanceStep(prForAction.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to advance step");
      return;
    }
    setCompleteModalOpen(false);
    setPrForAction(null);
    toast.success("PR advanced to next step");
    void fetchData();
  }, [prForAction, fetchData]);

  return (
    <div>
      <div className="app__title">
        <h1 className="app__title_text flex items-center gap-2">
          <FileSearch className="h-5 w-5" />
          Pre-Procurement
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
              <FileSearch className="mx-auto h-12 w-12 text-muted-foreground" />
            </div>
            <p className="app__empty_state_title">No purchase requests</p>
            <p className="app__empty_state_description">
              No purchase requests at Pre-Procurement for fiscal year{" "}
              {CURRENT_FISCAL_YEAR}. Mark PRs as &quot;For Procurement&quot; on
              the Purchase Requests page first.
            </p>
            <Button variant="green" className="mt-4" asChild>
              <Link href="/procurement-execution/purchaserequests">
                View Purchase Requests
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
                    <th className="app__table_th">Procurement Mode</th>
                    <th className="app__table_th">ABC</th>
                    <th className="app__table_th">Conference Date</th>
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
                        {pr.ppmp_row?.procurement_mode || "-"}
                      </td>
                      <td className="app__table_td tabular-nums">
                        {formatABC(pr.ppmp_row?.estimated_budget)}
                      </td>
                      <td className="app__table_td text-sm text-muted-foreground">
                        {formatDate(pr.conference_date)}
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
                                setScheduleModalOpen(true);
                              }}
                              className="cursor-pointer"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              Schedule Pre-Procurement
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setPrForAction(pr);
                                setCompleteModalOpen(true);
                              }}
                              className="cursor-pointer"
                            >
                              <List className="mr-2 h-4 w-4" />
                              Complete → Ready for RFQ/Bidding
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
        open={scheduleModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setScheduleModalOpen(false);
            setPrForAction(null);
            setConferenceDate("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Pre-Procurement Conference</DialogTitle>
            <DialogDescription>
              Set the date for the pre-procurement conference.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="conference-date">Conference Date</Label>
              <Input
                id="conference-date"
                type="date"
                value={conferenceDate}
                onChange={(e) => setConferenceDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setScheduleModalOpen(false);
                setPrForAction(null);
                setConferenceDate("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="green"
              onClick={handleSchedulePreProcurement}
              disabled={!conferenceDate}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationModal
        isOpen={completeModalOpen}
        onClose={() => {
          setCompleteModalOpen(false);
          setPrForAction(null);
        }}
        onConfirm={handleCompletePreProcurement}
        message={
          <p className="text-sm text-muted-foreground">
            Mark this Purchase Request as Ready for RFQ/Bidding? It will move to
            the RFQ / Bidding page.
          </p>
        }
      />
    </div>
  );
}
