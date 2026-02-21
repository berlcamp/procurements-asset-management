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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hook";
import { addItem, updateList } from "@/lib/redux/listSlice";
import { supabase } from "@/lib/supabase/client";
import { Office, PPMP, School } from "@/types/database";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

type ItemType = PPMP;
const table = "ppmp";
const title = "PPMP";

const currentYear = new Date().getFullYear();
const FISCAL_YEARS = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2];

const FormSchema = z
  .object({
    fiscal_year: z.number({ required_error: "Fiscal year is required" }),
    end_user_type: z.enum(["school", "office"], {
      required_error: "End user type is required",
    }),
    school_id: z.union([z.string(), z.number()]).optional().nullable(),
    office_id: z.union([z.string(), z.number()]).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.end_user_type === "school") {
      const id = data.school_id;
      if (id == null || id === "" || id === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["school_id"],
          message: "School is required",
        });
      }
    }
    if (data.end_user_type === "office") {
      const id = data.office_id;
      if (id == null || id === "" || id === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["office_id"],
          message: "Office is required",
        });
      }
    }
  });

type FormType = z.infer<typeof FormSchema>;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: ItemType | null;
}

export const AddModal = ({ isOpen, onClose, editData }: ModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);

  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user.user);

  const form = useForm<FormType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      fiscal_year: currentYear,
      end_user_type: undefined,
      school_id: null,
      office_id: null,
    },
  });

  const selectedType = form.watch("end_user_type");

  useEffect(() => {
    if (!selectedType) return;
    if (selectedType === "school") {
      form.setValue("office_id", null);
    } else if (selectedType === "office") {
      form.setValue("school_id", null);
    }
  }, [selectedType, form]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchOptions = async () => {
      const [schoolsRes, officesRes] = await Promise.all([
        supabase.from("schools").select("id, name").order("name"),
        supabase.from("offices").select("id, name").order("name"),
      ]);
      if (schoolsRes.data) setSchools((schoolsRes.data as School[]) ?? []);
      if (officesRes.data) setOffices((officesRes.data as Office[]) ?? []);
    };
    fetchOptions();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && editData) {
      form.reset({
        fiscal_year: editData.fiscal_year,
        end_user_type: editData.end_user_type,
        school_id: editData.school_id ?? null,
        office_id: editData.office_id ?? null,
      });
    } else if (isOpen) {
      form.reset({
        fiscal_year: currentYear,
        end_user_type: undefined,
        school_id: user?.school_id != null ? user.school_id : null,
        office_id: user?.office_id != null ? user.office_id : null,
      });
      if (user?.school_id != null) {
        form.setValue("end_user_type", "school");
      } else if (user?.office_id != null) {
        form.setValue("end_user_type", "office");
      }
    }
  }, [form, editData, isOpen, user?.school_id, user?.office_id]);

  const onSubmit = async (data: FormType) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const payload: Record<string, string | number | null> = {
        fiscal_year: data.fiscal_year,
        end_user_type: data.end_user_type,
        school_id: null,
        office_id: null,
      };

      if (data.end_user_type === "school" && data.school_id != null && data.school_id !== "") {
        payload.school_id = Number(data.school_id);
        payload.office_id = null;
      } else if (data.end_user_type === "office" && data.office_id != null && data.office_id !== "") {
        payload.office_id = Number(data.office_id);
        payload.school_id = null;
      }

      if (editData?.id) {
        const { error } = await supabase
          .from(table)
          .update(payload)
          .eq("id", editData.id);

        if (error) throw new Error(error.message);

        const { data: updated } = await supabase
          .from(table)
          .select("*, school:schools!school_id(id, name), office:offices!office_id(id, name)")
          .eq("id", editData.id)
          .single();

        if (updated) {
          dispatch(updateList(updated));
        }

        onClose();
        toast.success("PPMP updated successfully!");
      } else {
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
      }
    } catch (err) {
      console.error("Submission error:", err);
      toast.error(err instanceof Error ? err.message : "Error saving PPMP");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {editData ? "Edit" : "Add"} {title}
          </DialogTitle>
          <DialogDescription>
            {editData
              ? "Update the Project Procurement Management Plan."
              : "Create a new PPMP for a fiscal year and end user."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="fiscal_year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Fiscal Year <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(Number(v))}
                    value={field.value != null ? String(field.value) : ""}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select fiscal year" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FISCAL_YEARS.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="end_user_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    End User Type <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select School or Office" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="school">School</SelectItem>
                      <SelectItem value="office">Office</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedType === "school" && (
              <FormField
                control={form.control}
                name="school_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      School <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === "" ? null : v)}
                      value={field.value != null ? String(field.value) : ""}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select school" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {schools.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedType === "office" && (
              <FormField
                control={form.control}
                name="office_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Office <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === "" ? null : v)}
                      value={field.value != null ? String(field.value) : ""}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select office" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {offices.map((o) => (
                          <SelectItem key={o.id} value={String(o.id)}>
                            {o.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="gap-2 space-x-2 sm:gap-2">
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
                type="submit"
                disabled={isSubmitting}
                className="h-10 min-w-[100px]"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {editData ? "Updating..." : "Saving..."}
                  </span>
                ) : editData ? (
                  "Update"
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
