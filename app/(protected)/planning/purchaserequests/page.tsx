"use client";

import { TableSkeleton } from "@/components/TableSkeleton";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/lib/redux/hook";
import { supabase } from "@/lib/supabase/client";
import type { PurchaseRequest } from "@/types/database";
import { ClipboardList } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type PRWithContext = PurchaseRequest & {
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

export default function PurchaseRequestsPage() {
  const user = useAppSelector((state) => state.user.user);
  const systemUserId = user?.system_user_id as number | undefined;
  const [prs, setPrs] = useState<PRWithContext[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (systemUserId == null) {
      setLoading(false);
      setPrs([]);
      return;
    }
    const { data, error } = await supabase
      .from("purchase_requests")
      .select(
        "*, ppmp_row:ppmp_rows!ppmp_row_id(id, general_description, ppmp_id, ppmp:ppmp!ppmp_id(fiscal_year, school_id, office_id, school:schools!school_id(id, name), office:offices!office_id(id, name)))"
      )
      .eq("created_by", systemUserId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setPrs([]);
    } else {
      setPrs((data ?? []) as PRWithContext[]);
    }
    setLoading(false);
  }, [systemUserId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (systemUserId == null) {
    return (
      <div>
        <div className="app__title">
          <h1 className="app__title_text flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Purchase Requests
          </h1>
        </div>
        <div className="app__content">
          <div className="app__empty_state">
            <p className="app__empty_state_title">Unable to load</p>
            <p className="app__empty_state_description">
              Please sign in to view your purchase requests.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="app__title">
        <h1 className="app__title_text flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Purchase Requests
        </h1>
        <div className="app__title_actions">
          <Button variant="outline" size="sm" asChild>
            <Link href="/planning/ppmp">Go to PPMP</Link>
          </Button>
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
              Create purchase requests from approved PPMP rows on the PPMP details
              page.
            </p>
            <Button variant="green" className="mt-4" asChild>
              <Link href="/planning/ppmp">View PPMP</Link>
            </Button>
          </div>
        ) : (
          <div className="app__table_container">
            <div className="app__table_wrapper">
              <table className="app__table">
                <thead className="app__table_thead">
                  <tr>
                    <th className="app__table_th">PR #</th>
                    <th className="app__table_th">PPMP FY</th>
                    <th className="app__table_th">End User</th>
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
                        {getEndUserLabel(pr)}
                      </td>
                      <td className="app__table_td">
                        <span className="line-clamp-2 text-sm">
                          {pr.ppmp_row?.general_description || "-"}
                        </span>
                      </td>
                      <td className="app__table_td">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            pr.status === "submitted"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                          }`}
                        >
                          {pr.status}
                        </span>
                      </td>
                      <td className="app__table_td text-sm text-muted-foreground">
                        {formatDate(pr.created_at)}
                      </td>
                      <td className="app__table_td_actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="h-8"
                        >
                          <Link
                            href={`/planning/ppmp/${pr.ppmp_row?.ppmp_id ?? ""}`}
                          >
                            View PPMP
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
