"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter as FilterIcon, X } from "lucide-react";
import { useEffect, useState } from "react";

const FISCAL_YEARS = [2026, 2025, 2024, 2023];

export type PPMPFilter = {
  fiscalYear?: number;
  endUserType?: "school" | "office";
};

export const Filter = ({
  filter,
  setFilter,
}: {
  filter: PPMPFilter;
  setFilter: (filter: PPMPFilter) => void;
}) => {
  const [fiscalYear, setFiscalYear] = useState<string>(
    filter.fiscalYear != null ? String(filter.fiscalYear) : "all",
  );
  const [endUserType, setEndUserType] = useState<string>(
    filter.endUserType ?? "all",
  );
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setFilter({
      fiscalYear:
        fiscalYear && fiscalYear !== "all" ? Number(fiscalYear) : undefined,
      endUserType:
        endUserType && endUserType !== "all"
          ? (endUserType as "school" | "office")
          : undefined,
    });
  }, [fiscalYear, endUserType, setFilter]);

  const handleReset = () => {
    setFiscalYear("all");
    setEndUserType("all");
    setFilter({});
  };

  const filterCount = [
    fiscalYear !== "all",
    endUserType !== "all",
  ].filter(Boolean).length;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 border-gray-300 hover:bg-gray-50"
        >
          <FilterIcon className="h-4 w-4" />
          Filter
          {filterCount > 0 && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {filterCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-4">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700">
              Fiscal Year
            </label>
            <Select value={fiscalYear} onValueChange={setFiscalYear}>
              <SelectTrigger className="h-10 w-full border-gray-300">
                <SelectValue placeholder="All years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {FISCAL_YEARS.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700">
              End User
            </label>
            <Select
              value={endUserType}
              onValueChange={setEndUserType}
            >
              <SelectTrigger className="h-10 w-full border-gray-300">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="school">School</SelectItem>
                <SelectItem value="office">Office</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(fiscalYear !== "all" || endUserType !== "all") && (
            <div className="flex justify-end">
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={handleReset}
                className="h-9 border-gray-300 hover:bg-gray-50"
              >
                <X size={14} className="mr-1.5" />
                Clear
              </Button>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
