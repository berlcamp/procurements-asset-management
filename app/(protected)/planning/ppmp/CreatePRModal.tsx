"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase/client";
import type {
  PPMPRow,
  PPMPRowLot,
  PPMPRowLotItem,
} from "@/types/database";
import { Check, ClipboardList } from "lucide-react";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";

/** Key format for identifying items already in PRs: "lotIndex-itemIndex" */
export function getItemKey(lotIndex: number, itemIndex: number): string {
  return `${lotIndex}-${itemIndex}`;
}

interface CreatePRModalProps {
  isOpen: boolean;
  onClose: () => void;
  row: PPMPRow;
  itemsAlreadyInPRs: Set<string>;
  systemUserId: number;
  onSuccess: () => void;
}

export function CreatePRModal({
  isOpen,
  onClose,
  row,
  itemsAlreadyInPRs,
  systemUserId,
  onSuccess,
}: CreatePRModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lots = Array.isArray(row.items) ? row.items : [];
  const hasSelectableItems = lots.some(
    (lot, lotIdx) =>
      (lot.items ?? []).some(
        (_, itemIdx) => !itemsAlreadyInPRs.has(getItemKey(lotIdx, itemIdx))
      )
  );

  const toggleItem = useCallback(
    (lotIndex: number, itemIndex: number) => {
      const key = getItemKey(lotIndex, itemIndex);
      if (itemsAlreadyInPRs.has(key)) return;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    },
    [itemsAlreadyInPRs]
  );

  const handleSubmit = useCallback(async () => {
    if (selected.size === 0) {
      toast.error("Select at least one item");
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: prData, error: prError } = await supabase
        .from("purchase_requests")
        .insert({
          ppmp_row_id: row.id,
          created_by: systemUserId,
          status: "draft",
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (prError) {
        toast.error(prError.message);
        return;
      }

      const prId = (prData as { id: number }).id;
      const itemsToInsert: {
        purchase_request_id: number;
        ppmp_row_id: number;
        lot_index: number;
        item_index: number;
        description: string | null;
        quantity: number | null;
        unit: string | null;
        estimated_cost: number | null;
      }[] = [];

      for (const key of selected) {
        const [lotIdxStr, itemIdxStr] = key.split("-");
        const lotIdx = parseInt(lotIdxStr, 10);
        const itemIdx = parseInt(itemIdxStr, 10);
        const lot = lots[lotIdx];
        const item = (lot?.items ?? [])[itemIdx] as PPMPRowLotItem | undefined;
        if (!item) continue;
        itemsToInsert.push({
          purchase_request_id: prId,
          ppmp_row_id: row.id,
          lot_index: lotIdx,
          item_index: itemIdx,
          description: item.description ?? null,
          quantity: item.quantity ?? null,
          unit: item.unit ?? null,
          estimated_cost: item.estimated_cost ?? null,
        });
      }

      const { error: itemsError } = await supabase
        .from("purchase_request_items")
        .insert(itemsToInsert);

      if (itemsError) {
        toast.error(itemsError.message);
        return;
      }

      toast.success("Purchase Request created");
      onSuccess();
      onClose();
      setSelected(new Set());
    } finally {
      setIsSubmitting(false);
    }
  }, [row.id, selected, systemUserId, lots, onSuccess, onClose]);

  const handleClose = useCallback(() => {
    setSelected(new Set());
    onClose();
  }, [onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Create Purchase Request
          </DialogTitle>
          <DialogDescription>
            Select lots/items to include in this Purchase Request. Items already
            in a PR are highlighted in green and cannot be selected.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {lots.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No lots/items in this row.
            </p>
          ) : (
            lots.map((lot, lotIdx) => {
              const lotItems = lot.items ?? [];
              const lotName = lot.name?.trim() || `Lot ${lotIdx + 1}`;
              return (
                <div
                  key={lotIdx}
                  className="rounded-lg border bg-muted/30 p-3 space-y-2"
                >
                  <h4 className="text-sm font-medium text-foreground">
                    {lotName}
                  </h4>
                  <ul className="space-y-1.5">
                    {lotItems.map((item: PPMPRowLotItem, itemIdx: number) => {
                      const key = getItemKey(lotIdx, itemIdx);
                      const inPR = itemsAlreadyInPRs.has(key);
                      const isSelected = selected.has(key);
                      const desc =
                        item.description?.trim() || `Item ${itemIdx + 1}`;
                      const qty =
                        item.quantity != null ? item.quantity : "-";
                      const unit = item.unit?.trim() || "";
                      const cost =
                        item.estimated_cost != null
                          ? item.estimated_cost.toLocaleString("en-PH", {
                              minimumFractionDigits: 2,
                            })
                          : "-";
                      return (
                        <li
                          key={itemIdx}
                          className={`flex items-start gap-3 rounded-md px-3 py-2 text-sm ${
                            inPR
                              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800"
                              : isSelected
                                ? "bg-primary/10 border border-primary/30"
                                : "bg-background hover:bg-muted/50 border border-transparent"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={inPR}
                            onChange={() => toggleItem(lotIdx, itemIdx)}
                            className="mt-1 h-4 w-4 shrink-0 rounded border border-primary"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="font-medium">{desc}</span>
                            <span className="text-muted-foreground">
                              {" "}
                              ({qty}
                              {unit ? ` ${unit}` : ""}) — PhP {cost}
                            </span>
                            {inPR && (
                              <span className="ml-2 inline-flex items-center gap-1 rounded bg-green-200/80 dark:bg-green-800/50 px-1.5 py-0.5 text-xs">
                                <Check className="h-3 w-3" />
                                In PR
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selected.size === 0 || isSubmitting || !hasSelectableItems}
          >
            {isSubmitting ? "Creating…" : "Create PR"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
