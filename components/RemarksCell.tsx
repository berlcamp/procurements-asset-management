"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { formatUserTypeLabel } from "@/lib/constants";
import { useAppSelector } from "@/lib/redux/hook";
import { supabase } from "@/lib/supabase/client";
import { MessageSquare, Plus } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

/** Shared shape for PPMP remarks and PPMP row remarks */
export interface RemarkDisplay {
  id: number;
  text: string;
  role: string | null;
  created_at: string;
}

interface RemarksCellProps {
  /** Remarks to display (from ppmp_remarks or ppmp_row_remarks) */
  remarks: RemarkDisplay[];
  /** Insert into ppmp_remarks (provide ppmp_id) or ppmp_row_remarks (provide ppmp_row_id) */
  variant: "ppmp" | "ppmp_row";
  /** ppmp_id when variant="ppmp", ppmp_row_id when variant="ppmp_row" */
  parentId: number;
  /** Called after a new remark is added so the parent can refetch */
  onRemarkAdded?: () => void;
  /** Whether the current user can add remarks. Defaults to true when system_user_id is present. */
  canAddRemark?: boolean;
}

function formatRemarkDate(d: string | null | undefined): string {
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

export function RemarksCell({
  remarks,
  variant,
  parentId,
  onRemarkAdded,
  canAddRemark = true,
}: RemarksCellProps) {
  const user = useAppSelector((state) => state.user.user);
  const systemUserId = user?.system_user_id as number | undefined;
  const userRole = user?.type ? formatUserTypeLabel(user.type) : "User";

  const [open, setOpen] = useState(false);
  const [newRemark, setNewRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const count = remarks?.length ?? 0;
  const canAdd = canAddRemark && systemUserId != null;

  const handleAddRemark = async () => {
    const text = newRemark.trim();
    if (!text || submitting) return;

    setSubmitting(true);
    const table = "ppmp_row_remarks";

    const { error } = await supabase.from(table).insert({
      ppmp_row_id: parentId,
      text,
      role: userRole,
      created_by: systemUserId,
    });

    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Remark added");
    setNewRemark("");
    onRemarkAdded?.();
  };

  if (count === 0 && !canAdd) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto gap-1.5 px-2 py-1 text-muted-foreground hover:text-foreground"
        >
          <MessageSquare className="h-3.5 w-3.5 shrink-0" />
          <span className="text-sm">
            {count === 0 && canAdd
              ? "Add remark"
              : `${count} remark${count !== 1 ? "s" : ""}`}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[420px] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="space-y-0">
          {/* Remarks list */}
          <div className="max-h-[240px] overflow-auto border-b">
            {count === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No remarks yet. {canAdd ? "Add one below." : ""}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-muted/90">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                      Role
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                      Remark
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {remarks.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2">{r.role ?? "-"}</td>
                      <td className="max-w-[180px] break-words px-3 py-2">
                        {r.text}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                        {formatRemarkDate(r.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Add remark form */}
          {canAdd && (
            <div className="p-3">
              <div className="flex flex-col gap-2">
                <Textarea
                  placeholder="Write a remark..."
                  value={newRemark}
                  onChange={(e) => setNewRemark(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAddRemark();
                    }
                  }}
                  className="min-h-[72px] resize-none text-sm"
                  disabled={submitting}
                  aria-label="Remark text"
                />
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleAddRemark}
                  disabled={!newRemark.trim() || submitting}
                  className="w-fit gap-1.5"
                >
                  {submitting ? (
                    "..."
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      Add remark
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
