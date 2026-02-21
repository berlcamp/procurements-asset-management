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
import { Input } from "@/components/ui/input";
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
import { School } from "@/types/database";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

type SchoolWithHead = School & { head?: { id: number; name: string } | null };
const table = "schools";
const title = "School";

const FormSchema = z.object({
  name: z.string().min(1, "School name is required"),
  head_user_id: z.string().optional(),
});

type FormType = z.infer<typeof FormSchema>;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: SchoolWithHead | null;
}

export function AddModal({ isOpen, onClose, editData }: ModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<{ id: number; name: string }[]>([]);

  const dispatch = useAppDispatch();

  const form = useForm<FormType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      head_user_id: undefined,
    },
  });

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from("users")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      setUsers((data ?? []) as { id: number; name: string }[]);
    };
    if (isOpen) void fetchUsers();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && editData) {
      form.reset({
        name: editData.name ?? "",
        head_user_id:
          editData.head_user_id != null
            ? String(editData.head_user_id)
            : "__none__",
      });
    } else if (isOpen) {
      form.reset({ name: "", head_user_id: "__none__" });
    }
  }, [form, editData, isOpen]);

  const onSubmit = async (data: FormType) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const headId =
        data.head_user_id &&
        data.head_user_id !== "" &&
        data.head_user_id !== "__none__"
          ? Number(data.head_user_id)
          : null;
      const payload = {
        name: data.name.trim(),
        head_user_id: headId,
      };

      if (editData?.id) {
        const { error } = await supabase
          .from(table)
          .update(payload)
          .eq("id", editData.id);

        if (error) throw new Error(error.message);

        const { data: updated } = await supabase
          .from(table)
          .select("*, head:users!head_user_id(id, name)")
          .eq("id", editData.id)
          .single();

        if (updated) dispatch(updateList(updated));
        onClose();
        toast.success("School updated successfully!");
      } else {
        const { data: inserted, error } = await supabase
          .from(table)
          .insert([payload])
          .select("*, head:users!head_user_id(id, name)")
          .single();

        if (error) throw new Error(error.message);
        dispatch(addItem(inserted));
        onClose();
        toast.success("School added successfully!");
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Error saving school");
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
              ? "Update school information."
              : "Fill in the details to add a new school."}
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
                    School Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter school name"
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
              name="head_user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    School Head
                  </FormLabel>
                  <Select
                    onValueChange={(v) =>
                      field.onChange(v === "__none__" ? "" : v)
                    }
                    value={
                      field.value && field.value !== ""
                        ? field.value
                        : "__none__"
                    }
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select school head" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                {isSubmitting
                  ? "Saving..."
                  : editData
                    ? "Update"
                    : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
