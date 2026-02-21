"use client";

import { ConfirmationModal } from "@/components/ConfirmationModal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppDispatch } from "@/lib/redux/hook";
import { deleteItem } from "@/lib/redux/listSlice";
import { supabase } from "@/lib/supabase/client";
import { RootState } from "@/types";
import { PPMP, type PPMPRemark } from "@/types/database";
import {
  Building2,
  ChevronRight,
  MoreVertical,
  Pencil,
  School,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import { AddModal } from "./AddModal";

type ItemType = PPMP;
const table = "ppmp";

function getEndUserLabel(item: ItemType): string {
  if (item.end_user_type === "school" && item.school?.name) {
    return item.school.name;
  }
  if (item.end_user_type === "office" && item.office?.name) {
    return item.office.name;
  }
  return "-";
}

function formatPPMPRemarks(remarks: PPMPRemark[] | undefined | null): string {
  if (!remarks || !Array.isArray(remarks) || remarks.length === 0) return "-";
  return remarks
    .map((r) => r.text?.trim())
    .filter(Boolean)
    .join("; ") || "-";
}

export const List = () => {
  const dispatch = useAppDispatch();
  const list = useSelector(
    (state: RootState) => state.list.value,
  ) as ItemType[];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAddOpen, setModalAddOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemType | null>(null);

  const handleDeleteConfirmation = (item: ItemType) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleEdit = (item: ItemType) => {
    setSelectedItem(item);
    setModalAddOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", selectedItem.id);

    if (error) {
      if (error.code === "23503") {
        toast.error("Selected record cannot be deleted.");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Successfully deleted!");
      dispatch(deleteItem(selectedItem));
      setIsModalOpen(false);
    }
  };

  return (
    <div className="app__table_container">
      <div className="app__table_wrapper">
        <table className="app__table">
          <thead className="app__table_thead">
            <tr>
              <th className="app__table_th">Fiscal Year</th>
              <th className="app__table_th">End User</th>
              <th className="app__table_th">Status</th>
              <th className="app__table_th">Remarks</th>
              <th className="app__table_th_right">Actions</th>
            </tr>
          </thead>
          <tbody className="app__table_tbody">
            {list.map((item: ItemType) => (
              <tr key={item.id} className="app__table_tr">
                <td className="app__table_td">
                  <div className="flex flex-col gap-2">
                    <span className="font-medium">{item.fiscal_year}</span>
                  </div>
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
                      {item.end_user_type === "school" ? "School" : "Office"}
                    </span>
                  </div>
                </td>
                <td className="app__table_td">
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary">
                    {item.status || "draft"}
                  </span>
                </td>
                <td className="app__table_td">
                  <span
                    className="block max-w-xs line-clamp-2 text-xs text-muted-foreground"
                    title={formatPPMPRemarks(item.remarks as PPMPRemark[] | undefined)}
                  >
                    {formatPPMPRemarks(item.remarks as PPMPRemark[] | undefined)}
                  </span>
                </td>
                <td className="app__table_td_actions">
                  <div className="app__table_action_container gap-2">
                    <Button
                      size="sm"
                      asChild
                      className="bg-green-600 text-white hover:bg-green-700 hover:text-white"
                    >
                      <Link
                        href={`/planning/ppmp/${item.id}`}
                        className="inline-flex items-center gap-2"
                      >
                        PPMP Details
                        <ChevronRight />
                      </Link>
                    </Button>
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
                      <DropdownMenuContent align="end" className="w-40">
                        {item.status === "draft" ? (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleEdit(item)}
                              className="cursor-pointer"
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteConfirmation(item)}
                              variant="destructive"
                              className="cursor-pointer"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <DropdownMenuItem disabled>
                            No actions available
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleDelete}
        message="Are you sure you want to delete this PPMP?"
      />
      <AddModal
        isOpen={modalAddOpen}
        editData={selectedItem}
        onClose={() => setModalAddOpen(false)}
      />
    </div>
  );
};
