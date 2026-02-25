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
import { CURRENT_FISCAL_YEAR } from "@/lib/constants";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hook";
import { addItem } from "@/lib/redux/listSlice";
import { supabase } from "@/lib/supabase/client";
import { Office, PPMP, School } from "@/types/database";
import { Building2, School as SchoolIcon } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type ItemType = PPMP;
const table = "ppmp";
const title = "PPMP";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: ItemType | null;
}

export const AddModal = ({ isOpen, onClose, editData }: ModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [school, setSchool] = useState<School | null>(null);
  const [office, setOffice] = useState<Office | null>(null);

  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user.user);

  const endUserType =
    user?.account_type === "school"
      ? "school"
      : user?.account_type === "office"
        ? "office"
        : null;
  const schoolId =
    endUserType === "school" && user?.school_id != null
      ? Number(user.school_id)
      : null;
  const officeId =
    endUserType === "office" && user?.office_id != null
      ? Number(user.office_id)
      : null;

  useEffect(() => {
    if (!isOpen) return;
    const fetchEndUserName = async () => {
      if (schoolId) {
        const { data } = await supabase
          .from("schools")
          .select("id, name")
          .eq("id", schoolId)
          .single();
        setSchool((data as School) ?? null);
        setOffice(null);
      } else if (officeId) {
        const { data } = await supabase
          .from("offices")
          .select("id, name")
          .eq("id", officeId)
          .single();
        setOffice((data as Office) ?? null);
        setSchool(null);
      } else {
        setSchool(null);
        setOffice(null);
      }
    };
    fetchEndUserName();
  }, [isOpen, schoolId, officeId]);

  const endUserName =
    endUserType === "school" ? school?.name : endUserType === "office" ? office?.name : null;
  const displayLabel =
    endUserType === "school" ? "School" : endUserType === "office" ? "Office" : null;

  const canCreate =
    !editData &&
    endUserType != null &&
    ((endUserType === "school" && schoolId != null) ||
      (endUserType === "office" && officeId != null)) &&
    user?.system_user_id != null;

  const handleCreate = async () => {
    if (!canCreate || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const payload: Record<string, string | number | null> = {
        fiscal_year: CURRENT_FISCAL_YEAR,
        end_user_type: endUserType,
        school_id: endUserType === "school" ? schoolId : null,
        office_id: endUserType === "office" ? officeId : null,
        created_by: user?.system_user_id ?? null,
      };

      const { data: inserted, error } = await supabase
        .from(table)
        .insert([payload])
        .select("*, school:schools!school_id(id, name), office:offices!office_id(id, name)")
        .single();

      if (error) {
        if (error.code === "23505") {
          toast.error("A PPMP already exists for this fiscal year and end user.");
          return;
        }
        throw new Error(error.message);
      }

      dispatch(addItem(inserted));
      onClose();
      toast.success("PPMP created successfully!");
    } catch (err) {
      console.error("Submission error:", err);
      toast.error(err instanceof Error ? err.message : "Error saving PPMP");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };

  if (editData) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {title} Details
            </DialogTitle>
            <DialogDescription>
              To edit this PPMP, go to the PPMP detail page.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <span className="text-sm font-medium text-muted-foreground">Fiscal Year</span>
              <p className="text-base font-medium">{editData.fiscal_year}</p>
            </div>
            <div className="space-y-1.5">
              <span className="text-sm font-medium text-muted-foreground">
                {editData.end_user_type === "school" ? "School" : "Office"}
              </span>
              <p className="text-base font-medium">
                {editData.end_user_type === "school"
                  ? editData.school?.name ?? "-"
                  : editData.office?.name ?? "-"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add {title}</DialogTitle>
          <DialogDescription>
            Create a new PPMP for fiscal year {CURRENT_FISCAL_YEAR}. Review the details below and confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-1.5">
            <span className="text-sm font-medium text-muted-foreground">Fiscal Year</span>
            <p className="text-base font-medium">{CURRENT_FISCAL_YEAR}</p>
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium text-muted-foreground">End User (Creator)</span>
            <p className="text-base font-medium">{user?.name ?? "-"}</p>
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium text-muted-foreground">
              {displayLabel ?? "End User"}
            </span>
            <p className="flex items-center gap-2 text-base font-medium">
              {endUserType === "school" ? (
                <SchoolIcon className="h-4 w-4 text-blue-600" />
              ) : endUserType === "office" ? (
                <Building2 className="h-4 w-4 text-amber-600" />
              ) : null}
              {endUserName ?? "-"}
            </p>
          </div>
        </div>

        {!canCreate && user && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Your account must be linked to a school or office to create a PPMP.
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="h-10"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={!canCreate || isSubmitting}
            className="h-10 min-w-[100px]"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving...
              </span>
            ) : (
              "Create PPMP"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
