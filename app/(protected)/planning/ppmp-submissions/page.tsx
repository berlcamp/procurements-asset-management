"use client";

import { TableSkeleton } from "@/components/TableSkeleton";
import { Button } from "@/components/ui/button";
import {
  isBacUser,
  isBudgetOfficer,
  isHope,
} from "@/lib/constants";
import { useAppSelector } from "@/lib/redux/hook";
import { supabase } from "@/lib/supabase/client";
import type { PPMP } from "@/types/database";
import { Building2, ChevronRight, FileText, School } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type PPMPWithHead = PPMP & {
  school?: { id: number; name: string; head_user_id?: number | null };
  office?: { id: number; name: string; head_user_id?: number | null };
};

function getEndUserLabel(item: PPMPWithHead): string {
  if (item.end_user_type === "school" && item.school?.name) {
    return item.school.name;
  }
  if (item.end_user_type === "office" && item.office?.name) {
    return item.office.name;
  }
  return "-";
}

export default function PPMPSubmissionsPage() {
  const user = useAppSelector((state) => state.user.user);
  const systemUserId = user?.system_user_id;

  const [allItems, setAllItems] = useState<PPMPWithHead[]>([]);
  const [loading, setLoading] = useState(true);

  const statusesToFetch = useMemo(() => {
    if (isBudgetOfficer(user?.type)) {
      return ["submitted_to_budget", "returned_to_budget"];
    }
    if (isBacUser(user?.type)) {
      return ["submitted_to_bac", "returned_to_bac"];
    }
    if (isHope(user?.type)) {
      return ["submitted_to_hope"];
    }
    return ["submitted", "returned_to_unit_head"];
  }, [user?.type]);

  const fetchData = useCallback(async () => {
    const { data, error } = await supabase
      .from("ppmp")
      .select(
        "*, school:schools!school_id(id, name, head_user_id), office:offices!office_id(id, name, head_user_id)",
      )
      .in("status", statusesToFetch)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error(error);
      setAllItems([]);
    } else {
      setAllItems((data as PPMPWithHead[]) ?? []);
    }
    setLoading(false);
  }, [statusesToFetch]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const list = useMemo(() => {
    if (systemUserId == null) return [];
    if (
      isBudgetOfficer(user?.type) ||
      isBacUser(user?.type) ||
      isHope(user?.type)
    ) {
      return allItems;
    }
    return allItems.filter((item) => {
      if (item.end_user_type === "school" && item.school?.head_user_id) {
        return item.school.head_user_id === systemUserId;
      }
      if (item.end_user_type === "office" && item.office?.head_user_id) {
        return item.office.head_user_id === systemUserId;
      }
      return false;
    });
  }, [allItems, systemUserId, user?.type]);

  if (loading) {
    return (
      <div className="app__content">
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div>
      <div className="app__title">
        <h1 className="app__title_text flex items-center gap-2">
          <FileText className="h-5 w-5" />
          PPMP Submissions
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isBudgetOfficer(user?.type)
            ? "PPMPs submitted for your budget review"
            : isBacUser(user?.type)
              ? "PPMPs submitted to BAC for your review"
              : isHope(user?.type)
                ? "PPMPs submitted for your approval as HOPE"
                : "PPMPs submitted for your review as Unit Head"}
        </p>
      </div>
      <div className="app__content">
        {list.length === 0 ? (
          <div className="app__empty_state">
            <div className="app__empty_state_icon">
              <FileText className="mx-auto h-12 w-12" />
            </div>
            <p className="app__empty_state_title">No PPMPs require your action</p>
            <p className="app__empty_state_description">
              {systemUserId == null
                ? "Sign in to see PPMPs submitted to you."
                : isBudgetOfficer(user?.type)
                  ? "When Unit Heads submit PPMPs for budget review, they will appear here."
                  : isBacUser(user?.type)
                    ? "When Budget Officers submit PPMPs to BAC, they will appear here."
                    : isHope(user?.type)
                      ? "When BAC submits PPMPs for approval, they will appear here."
                      : "When schools or offices submit PPMPs for your review, they will appear here."}
            </p>
          </div>
        ) : (
          <div className="app__table_container">
            <div className="app__table_wrapper">
              <table className="app__table">
                <thead className="app__table_thead">
                  <tr>
                    <th className="app__table_th">Fiscal Year</th>
                    <th className="app__table_th">End User</th>
                    <th className="app__table_th">Submitted</th>
                    <th className="app__table_th_right">Actions</th>
                  </tr>
                </thead>
                <tbody className="app__table_tbody">
                  {list.map((item) => (
                    <tr key={item.id} className="app__table_tr">
                      <td className="app__table_td">
                        <span className="font-medium">{item.fiscal_year}</span>
                      </td>
                      <td className="app__table_td">
                        <div className="flex flex-col gap-1.5">
                          <div className="app__table_cell_title">
                            {getEndUserLabel(item)}
                          </div>
                          <span
                            className={`inline-flex w-fit items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                              item.end_user_type === "school"
                                ? "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-800"
                                : "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800"
                            }`}
                          >
                            {item.end_user_type === "school" ? (
                              <School className="h-3.5 w-3.5" />
                            ) : (
                              <Building2 className="h-3.5 w-3.5" />
                            )}
                            {item.end_user_type === "school"
                              ? "School"
                              : "Office"}
                          </span>
                        </div>
                      </td>
                      <td className="app__table_td">
                        <span className="text-sm text-muted-foreground">
                          {item.updated_at
                            ? new Date(item.updated_at).toLocaleDateString(
                                "en-PH",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )
                            : "-"}
                        </span>
                      </td>
                      <td className="app__table_td_actions">
                        <Button
                          size="sm"
                          asChild
                          className="bg-blue-600 text-white hover:bg-blue-700 hover:text-white"
                        >
                          <Link
                            href={`/planning/ppmp/${item.id}`}
                            className="inline-flex items-center gap-2"
                          >
                            Review
                            <ChevronRight />
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
