"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import {
  PPMP_PROJECT_TYPES,
  PPMP_PROCUREMENT_MODES,
} from "@/lib/constants";
import { supabase } from "@/lib/supabase/client";
import type {
  PPMPRow,
  PPMPRowAttachment,
  PPMPRowLot,
  PPMPRowLotItem,
} from "@/types/database";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronLeft,
  ChevronRight,
  FilePlus,
  Package,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

const STEPS = [
  { id: 1, title: "Project Overview" },
  { id: 2, title: "Items to Procure" },
  { id: 3, title: "Procurement Details" },
  { id: 4, title: "Budget" },
  { id: 5, title: "Attachments" },
  { id: 6, title: "Remarks" },
];

const itemsSchema: z.ZodType<PPMPRowLot[]> = z.array(
  z.object({
    name: z.string().optional(),
    items: z.array(
      z.object({
        description: z.string().optional(),
        quantity: z.union([z.number(), z.nan()]).optional(),
        unit: z.string().optional(),
        estimated_cost: z.union([z.number(), z.nan()]).optional(),
      })
    ),
  })
);

const FormSchema = z.object({
  general_description: z.string().min(1, "Description is required"),
  project_type: z.enum(
    ["goods", "infrastructure", "consulting_services"],
    { required_error: "Project type is required" }
  ),
  items: itemsSchema,
  procurement_mode: z.string().optional(),
  pre_procurement_conference: z.boolean().default(false),
  procurement_start_date: z.string().optional(),
  procurement_end_date: z.string().optional(),
  delivery_period: z.string().optional(),
  source_of_funds: z.string().optional(),
  estimated_budget: z.union([z.string(), z.number()]).optional(),
  remarks: z.array(z.string()),
});

type FormType = z.infer<typeof FormSchema>;

const defaultLot: PPMPRowLot = { name: "", items: [] };
const defaultLotItem: PPMPRowLotItem = {
  description: "",
  quantity: undefined,
  unit: "",
  estimated_cost: undefined,
};

interface AddRowWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  ppmpId: number;
  onSuccess?: (row: PPMPRow) => void;
  editData?: PPMPRow | null;
}

export const AddRowWizardModal = ({
  isOpen,
  onClose,
  ppmpId,
  onSuccess,
  editData,
}: AddRowWizardModalProps) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);

  const form = useForm<FormType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      general_description: "",
      project_type: undefined,
      items: [structuredClone(defaultLot)],
      procurement_mode: undefined,
      pre_procurement_conference: false,
      procurement_start_date: "",
      procurement_end_date: "",
      delivery_period: "",
      source_of_funds: "",
      estimated_budget: "",
      remarks: [""],
    },
  });

  const items = form.watch("items");
  const remarks = form.watch("remarks");

  const addLot = useCallback(() => {
    form.setValue("items", [...items, structuredClone(defaultLot)]);
  }, [form, items]);

  const removeLot = useCallback(
    (idx: number) => {
      const next = items.filter((_, i) => i !== idx);
      if (next.length === 0) next.push(structuredClone(defaultLot));
      form.setValue("items", next);
    },
    [form, items]
  );

  const addItemToLot = useCallback(
    (lotIdx: number) => {
      const next = [...items];
      next[lotIdx] = {
        ...next[lotIdx],
        items: [...(next[lotIdx].items ?? []), structuredClone(defaultLotItem)],
      };
      form.setValue("items", next);
    },
    [form, items]
  );

  const removeItemFromLot = useCallback(
    (lotIdx: number, itemIdx: number) => {
      const next = [...items];
      const lotItems = next[lotIdx].items.filter((_, i) => i !== itemIdx);
      next[lotIdx] = { ...next[lotIdx], items: lotItems };
      form.setValue("items", next);
    },
    [form, items]
  );

  const addRemark = useCallback(() => {
    form.setValue("remarks", [...remarks, ""]);
  }, [form, remarks]);

  const removeRemark = useCallback(
    (idx: number) => {
      const next = remarks.filter((_, i) => i !== idx);
      if (next.length === 0) next.push("");
      form.setValue("remarks", next);
    },
    [form, remarks]
  );

  useEffect(() => {
    if (!isOpen) return;
    if (editData) {
      form.reset({
        general_description: editData.general_description ?? "",
        project_type: editData.project_type ?? undefined,
        items:
          (editData.items as PPMPRowLot[])?.length > 0
            ? (editData.items as PPMPRowLot[])
            : [structuredClone(defaultLot)],
        procurement_mode: editData.procurement_mode ?? undefined,
        pre_procurement_conference: editData.pre_procurement_conference ?? false,
        procurement_start_date: fromDateValue(editData.procurement_start_date),
        procurement_end_date: fromDateValue(editData.procurement_end_date),
        delivery_period: fromDateValue(editData.delivery_period),
        source_of_funds: editData.source_of_funds ?? "",
        estimated_budget:
          editData.estimated_budget != null
            ? String(editData.estimated_budget)
            : "",
        remarks:
          (editData.remarks as string[])?.length > 0
            ? (editData.remarks as string[])
            : [""],
      });
      setAttachmentFiles([]);
    } else {
      form.reset({
        general_description: "",
        project_type: undefined,
        items: [structuredClone(defaultLot)],
        procurement_mode: undefined,
        pre_procurement_conference: false,
        procurement_start_date: "",
        procurement_end_date: "",
        delivery_period: "",
        source_of_funds: "",
        estimated_budget: "",
        remarks: [""],
      });
      setAttachmentFiles([]);
    }
    setStep(1);
  }, [isOpen, editData, form]);

  const validateStep = async (s: number): Promise<boolean> => {
    const fields: (keyof FormType)[] =
      s === 1
        ? ["general_description", "project_type"]
        : s === 2
          ? ["items"]
          : s === 3
            ? []
            : s === 4
              ? []
              : s === 5
                ? []
                : [];
    if (fields.length === 0) return true;
    const result = await form.trigger(fields);
    return result;
  };

  const goNext = async () => {
    const ok = await validateStep(step);
    if (!ok) return;
    if (step < 6) setStep(step + 1);
  };

  const goBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      setAttachmentFiles([]);
      onClose();
    }
  };

  const uploadAttachments = async (): Promise<PPMPRowAttachment[]> => {
    const uploaded: PPMPRowAttachment[] = [];
    for (let i = 0; i < attachmentFiles.length; i++) {
      const file = attachmentFiles[i];
      if (!file) continue;
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `ppmp-${ppmpId}/${Date.now()}-${i}.${ext}`;
      const { data, error } = await supabase.storage
        .from("ppmp-attachments")
        .upload(path, file, { upsert: true });
      if (error) {
        toast.error(`Failed to upload ${file.name}: ${error.message}`);
        uploaded.push({ name: file.name, url: "" });
      } else {
        const {
          data: { publicUrl },
        } = supabase.storage.from("ppmp-attachments").getPublicUrl(data.path);
        uploaded.push({ name: file.name, url: publicUrl });
      }
    }
    return uploaded;
  };

  const onSubmit = async (data: FormType) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      let attachments: PPMPRowAttachment[] =
        (editData?.attachments as PPMPRowAttachment[] | undefined) ?? [];
      if (attachmentFiles.length > 0) {
        const uploaded = await uploadAttachments();
        attachments = [...attachments, ...uploaded];
      }

      const payload = {
        ppmp_id: ppmpId,
        general_description: data.general_description,
        project_type: data.project_type,
        items: data.items,
        procurement_mode: data.procurement_mode ?? null,
        pre_procurement_conference: data.pre_procurement_conference,
        procurement_start_date: toDateValue(data.procurement_start_date),
        procurement_end_date: toDateValue(data.procurement_end_date),
        delivery_period: toDateValue(data.delivery_period),
        source_of_funds: data.source_of_funds || null,
        estimated_budget: (() => {
          const val = data.estimated_budget;
          if (val === "" || val == null) return null;
          const num = Number(val);
          return !Number.isNaN(num) && Number.isFinite(num) ? num : null;
        })(),
        attachments,
        remarks: (data.remarks ?? []).filter((r) => r.trim().length > 0),
      };

      if (editData?.id) {
        const { data: updated, error } = await supabase
          .from("ppmp_rows")
          .update(payload)
          .eq("id", editData.id)
          .select()
          .single();

        if (error) throw new Error(error.message);
        onSuccess?.(updated as PPMPRow);
        toast.success("PPMP row updated successfully!");
      } else {
        const { data: inserted, error } = await supabase
          .from("ppmp_rows")
          .insert([payload])
          .select()
          .single();

        if (error) throw new Error(error.message);
        onSuccess?.(inserted as PPMPRow);
        toast.success("PPMP row added successfully!");
      }
      handleClose();
    } catch (err) {
      console.error("Submit error:", err);
      toast.error(
        err instanceof Error ? err.message : "Error saving PPMP row"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatProjectType = (v: string) =>
    v
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const formatProcurementMode = (v: string) =>
    v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " ");

  // Convert "YYYY-MM" (from type="month" input) to "YYYY-MM-01" for PostgreSQL DATE
  const toDateValue = (val: string | null | undefined): string | null => {
    if (!val || !val.trim()) return null;
    if (/^\d{4}-\d{2}$/.test(val)) return `${val}-01`;
    return val;
  };
  // Convert DB "YYYY-MM-DD" to "YYYY-MM" for type="month" input display
  const fromDateValue = (val: string | null | undefined): string => {
    if (!val || !val.trim()) return "";
    const match = val.match(/^(\d{4}-\d{2})/);
    return match ? match[1] : val;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {editData ? "Edit" : "Add"} PPMP Row
          </DialogTitle>
          <DialogDescription>
            {editData
              ? "Update the procurement project entry."
              : "Add a new procurement project to this PPMP."}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`flex items-center gap-1 text-xs ${
                s.id === step
                  ? "font-medium text-primary"
                  : s.id < step
                    ? "text-muted-foreground"
                    : "text-muted-foreground/60"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full ${
                  s.id === step
                    ? "bg-primary text-primary-foreground"
                    : s.id < step
                      ? "bg-primary/20"
                      : "bg-muted"
                }`}
              >
                {s.id}
              </span>
              {s.id < 6 && <ChevronRight className="h-3.5 w-3.5" />}
            </div>
          ))}
        </div>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (step === 6) {
                form.handleSubmit(onSubmit)(e);
              } else {
                goNext();
              }
            }}
            className="space-y-5"
          >
            {step === 1 && (
              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="general_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        General Description and Objective of the Project to be
                        Procured <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the project and its objectives..."
                          className="min-h-[100px]"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="project_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Type of the Project to be Procured{" "}
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select type (Goods, Infrastructure, or Consulting Services)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PPMP_PROJECT_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {formatProjectType(t)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-medium">
                    Items to be Procured (Lots and Items)
                  </FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLot}
                    disabled={isSubmitting}
                    className="h-8"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Lot
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Create lots and add multiple items per lot. Editable in the
                  future.
                </p>
                <div className="space-y-4">
                  {items.map((lot, lotIdx) => (
                    <div
                      key={lotIdx}
                      className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-900/30"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <Input
                          placeholder="Lot name (optional)"
                          value={lot.name ?? ""}
                          onChange={(e) => {
                            const next = [...items];
                            next[lotIdx] = {
                              ...next[lotIdx],
                              name: e.target.value,
                            };
                            form.setValue("items", next);
                          }}
                          className="h-9 max-w-[200px]"
                          disabled={isSubmitting}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeLot(lotIdx)}
                          disabled={items.length <= 1 || isSubmitting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {(lot.items ?? []).map((item, itemIdx) => (
                          <div
                            key={itemIdx}
                            className="flex flex-wrap items-start gap-2 rounded border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900/50"
                          >
                            <Input
                              placeholder="Item description *"
                              value={item.description}
                              onChange={(e) => {
                                const next = [...items];
                                const itemsArr = [...(next[lotIdx].items ?? [])];
                                itemsArr[itemIdx] = {
                                  ...itemsArr[itemIdx],
                                  description: e.target.value,
                                };
                                next[lotIdx] = {
                                  ...next[lotIdx],
                                  items: itemsArr,
                                };
                                form.setValue("items", next);
                              }}
                              className="min-w-[180px] flex-1"
                              disabled={isSubmitting}
                            />
                            <Input
                              type="number"
                              placeholder="Qty"
                              value={item.quantity ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                const next = [...items];
                                const itemsArr = [...(next[lotIdx].items ?? [])];
                                itemsArr[itemIdx] = {
                                  ...itemsArr[itemIdx],
                                  quantity: v ? Number(v) : undefined,
                                };
                                next[lotIdx] = { ...next[lotIdx], items: itemsArr };
                                form.setValue("items", next);
                              }}
                              className="h-9 w-16"
                              disabled={isSubmitting}
                            />
                            <Input
                              placeholder="Unit"
                              value={item.unit ?? ""}
                              onChange={(e) => {
                                const next = [...items];
                                const itemsArr = [...(next[lotIdx].items ?? [])];
                                itemsArr[itemIdx] = {
                                  ...itemsArr[itemIdx],
                                  unit: e.target.value,
                                };
                                next[lotIdx] = { ...next[lotIdx], items: itemsArr };
                                form.setValue("items", next);
                              }}
                              className="h-9 w-20"
                              disabled={isSubmitting}
                            />
                            <Input
                              type="number"
                              placeholder="Est. cost (PhP)"
                              value={item.estimated_cost ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                const next = [...items];
                                const itemsArr = [...(next[lotIdx].items ?? [])];
                                itemsArr[itemIdx] = {
                                  ...itemsArr[itemIdx],
                                  estimated_cost: v ? Number(v) : undefined,
                                };
                                next[lotIdx] = { ...next[lotIdx], items: itemsArr };
                                form.setValue("items", next);
                              }}
                              className="h-9 w-24"
                              disabled={isSubmitting}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                              onClick={() => removeItemFromLot(lotIdx, itemIdx)}
                              disabled={
                                (lot.items?.length ?? 0) <= 1 || isSubmitting
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addItemToLot(lotIdx)}
                          disabled={isSubmitting}
                          className="h-8"
                        >
                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                          Add Item
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="procurement_mode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Recommended Mode of Procurement
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="e.g. competitive bidding, negotiated procurement" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PPMP_PROCUREMENT_MODES.map((m) => (
                            <SelectItem key={m} value={m}>
                              {formatProcurementMode(m)}
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
                  name="pre_procurement_conference"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-medium">
                          Pre-Procurement Conference (Yes/No)
                        </FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Indicate if a pre-procurement conference is to be
                          held.
                        </p>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="procurement_start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Start of Procurement Activity
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="month"
                          disabled={isSubmitting}
                          {...field}
                          className="h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="procurement_end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        End of Procurement Activity
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="month"
                          disabled={isSubmitting}
                          {...field}
                          className="h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="delivery_period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Expected Delivery / Implementation Period
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="month"
                          disabled={isSubmitting}
                          {...field}
                          className="h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="source_of_funds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Source of Funds
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. GAA, corporate budget, special funds"
                          disabled={isSubmitting}
                          className="h-10"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="estimated_budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Estimated Budget / Authorized Budgetary Allocation (PhP)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          disabled={isSubmitting}
                          className="h-10"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {step === 5 && (
              <div className="space-y-5">
                <FormLabel className="text-sm font-medium">
                  Attached Supporting Document/s
                </FormLabel>
                <p className="text-xs text-muted-foreground">
                  Supporting documents (e.g., Market Scoping Checklist, technical
                  specs, TOR).
                </p>
                <div className="space-y-3">
                  <Input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      if (editData) {
                        setAttachmentFiles(files);
                      } else {
                        setAttachmentFiles((prev) => [...prev, ...files]);
                      }
                    }}
                    disabled={isSubmitting}
                    className="h-10"
                  />
                  {attachmentFiles.length > 0 && (
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {attachmentFiles.map((f, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <FilePlus className="h-4 w-4 shrink-0" />
                          {f.name}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() =>
                              setAttachmentFiles((prev) =>
                                prev.filter((_, j) => j !== i)
                              )
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {editData?.attachments?.length ? (
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {(editData.attachments as PPMPRowAttachment[]).map(
                        (a, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <FilePlus className="h-4 w-4 shrink-0" />
                            {a.name}
                            {a.url && (
                              <a
                                href={a.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                View
                              </a>
                            )}
                          </li>
                        )
                      )}
                    </ul>
                  ) : null}
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  Create a storage bucket named &quot;ppmp-attachments&quot; in
                  Supabase Dashboard for file uploads to work.
                </p>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-medium">Remarks</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRemark}
                    disabled={isSubmitting}
                    className="h-8"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Remark
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Additional notes (e.g., basis for revisions, procurement
                  strategies).
                </p>
                <div className="space-y-2">
                  {remarks.map((r, idx) => (
                    <div key={idx} className="flex gap-2">
                      <FormField
                        control={form.control}
                        name={`remarks.${idx}`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                placeholder="Enter remark"
                                disabled={isSubmitting}
                                className="h-10"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => removeRemark(idx)}
                        disabled={
                          (remarks?.length ?? 0) <= 1 || isSubmitting
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="flex justify-between gap-2 sm:justify-between">
              <div className="flex gap-2">
                {step > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goBack}
                    disabled={isSubmitting}
                    className="h-10"
                  >
                    <ChevronLeft className="mr-1.5 h-4 w-4" />
                    Back
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="h-10"
                  >
                    Cancel
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                {step < 6 ? (
                  <Button
                    type="button"
                    variant="green"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      goNext();
                    }}
                    disabled={isSubmitting}
                    className="h-10"
                  >
                    Next
                    <ChevronRight className="ml-1.5 h-4 w-4" />
                  </Button>
                ) : (
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
                )}
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
