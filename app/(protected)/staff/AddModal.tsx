// components/AddItemTypeModal.tsx
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatUserTypeLabel,
  getAccountType,
  isOfficeAccountType,
  isSchoolUserType,
  userTypes,
  type UserType,
} from "@/lib/constants";
import { useAppDispatch } from "@/lib/redux/hook";
import { addItem, updateList } from "@/lib/redux/listSlice";
import { supabase } from "@/lib/supabase/client";
import { Office, School, User } from "@/types/database";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

// Always update this on other pages
type ItemType = User;
const table = "users";
const title = "Staff";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: ItemType | null; // Optional prop for editing existing item
}

const FormSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    type: z.enum(userTypes, {
      required_error: "Staff type is required",
    }),
    designation: z.string().optional(),
    school_id: z.union([z.string(), z.number()]).optional().nullable(),
    office_id: z.union([z.string(), z.number()]).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (isSchoolUserType(data.type)) {
      const id = data.school_id;
      if (id == null || id === "" || id === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["school_id"],
          message: "School is required for this staff type",
        });
      }
    }
    if (isOfficeAccountType(data.type)) {
      const id = data.office_id;
      if (id == null || id === "" || id === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["office_id"],
          message: "Office is required for this staff type",
        });
      }
    }
  });

type FormType = z.infer<typeof FormSchema>;

export const AddModal = ({ isOpen, onClose, editData }: ModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);

  const dispatch = useAppDispatch();

  const editType = editData?.type;
  const form = useForm<FormType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: editData ? editData.name : "",
      email: editData ? editData.email : "",
      type:
        editType && userTypes.includes(editType as UserType)
          ? (editType as UserType)
          : undefined,
      designation: editData?.designation ?? "",
      school_id: editData?.school_id ?? null,
      office_id: editData?.office_id ?? null,
    },
  });

  const selectedType = form.watch("type");

  useEffect(() => {
    if (!selectedType) return;
    if (isSchoolUserType(selectedType)) {
      form.setValue("office_id", null);
    } else if (isOfficeAccountType(selectedType)) {
      form.setValue("school_id", null);
    } else {
      form.setValue("school_id", null);
      form.setValue("office_id", null);
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

  // Submit handler
  const onSubmit = async (data: FormType) => {
    if (isSubmitting) return; // 🚫 Prevent double-submit
    setIsSubmitting(true);

    try {
      const newData: Record<string, string | number | null | undefined> = {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        type: data.type,
        account_type: getAccountType(data.type),
        designation: data.designation?.trim() || null,
        school_id: null,
        office_id: null,
      };

      if (
        isSchoolUserType(data.type) &&
        data.school_id != null &&
        data.school_id !== ""
      ) {
        newData.school_id = Number(data.school_id);
        newData.office_id = null;
      } else if (
        isOfficeAccountType(data.type) &&
        data.office_id != null &&
        data.office_id !== ""
      ) {
        newData.office_id = Number(data.office_id);
        newData.school_id = null;
      }

      // Insert or Update logic
      if (editData?.id) {
        const { error } = await supabase
          .from(table)
          .update(newData)
          .eq("id", editData.id);

        if (error) throw new Error(error.message);

        // ✅ Fetch updated record
        const { data: updated } = await supabase
          .from(table)
          .select()
          .eq("id", editData.id)
          .single();

        if (updated) {
          dispatch(updateList(updated));
        }

        onClose();
        toast.success("Staff member updated successfully!");
      } else {
        const { data: inserted, error } = await supabase
          .from(table)
          .insert([newData])
          .select()
          .single();

        if (error) {
          if (error.code === "23505") toast.error("Email already exists");
          throw new Error(error.message);
        }

        dispatch(addItem(inserted));
        onClose();
        toast.success("Staff member added successfully!");
      }
    } catch (err) {
      console.error("Submission error:", err);
      toast.error(err instanceof Error ? err.message : "Error saving user");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const currentEditType = editData?.type;
      form.reset({
        name: editData?.name || "",
        email: editData?.email || "",
        type:
          currentEditType && userTypes.includes(currentEditType as UserType)
            ? (currentEditType as UserType)
            : undefined,
        designation: editData?.designation ?? "",
        school_id: editData?.school_id ?? null,
        office_id: editData?.office_id ?? null,
      });
    }
  }, [form, editData, isOpen]);

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
              ? "Update staff member information below."
              : "Fill in the details to add a new staff member."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Staff Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter full name"
                      className="h-10"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Email Address <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="staff@example.com"
                      className="h-10"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    This email will be used for login authentication.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    User Role <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select staff type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {userTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {formatUserTypeLabel(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    Select the role/type for this staff member.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="designation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Designation
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Teacher, Clerk"
                      className="h-10"
                      {...field}
                      value={field.value ?? ""}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isSchoolUserType(selectedType) && (
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

            {isOfficeAccountType(selectedType) && (
              <FormField
                control={form.control}
                name="office_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Functional Division{" "}
                      <span className="text-red-500">*</span>
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

            <DialogFooter className="gap-2 sm:gap-2 space-x-2">
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
