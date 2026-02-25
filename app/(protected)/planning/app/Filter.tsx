"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENT_FISCAL_YEAR } from "@/lib/constants";
import { Filter as FilterIcon, Search, X } from "lucide-react";
import { useEffect, useState } from "react";

const FISCAL_YEARS = [
  CURRENT_FISCAL_YEAR + 1,
  CURRENT_FISCAL_YEAR,
  CURRENT_FISCAL_YEAR - 1,
  CURRENT_FISCAL_YEAR - 2,
];

export type APPFilter = {
  keyword?: string;
  fiscalYear?: number;
  endUserType?: "school" | "office";
  appStatus?: "pending" | "approved";
};

export const Filter = ({
  filter,
  setFilter,
}: {
  filter: APPFilter;
  setFilter: (filter: APPFilter) => void;
}) => {
  const [keyword, setKeyword] = useState(filter.keyword ?? "");
  const [fiscalYear, setFiscalYear] = useState<string>(
    filter.fiscalYear != null ? String(filter.fiscalYear) : "all",
  );
  const [endUserType, setEndUserType] = useState<string>(
    filter.endUserType ?? "all",
  );
  const [appStatus, setAppStatus] = useState<string>(
    filter.appStatus ?? "all",
  );
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilter({
        keyword: keyword.trim() || undefined,
        fiscalYear:
          fiscalYear && fiscalYear !== "all" ? Number(fiscalYear) : undefined,
        endUserType:
          endUserType && endUserType !== "all"
            ? (endUserType as "school" | "office")
            : undefined,
        appStatus:
          appStatus && appStatus !== "all"
            ? (appStatus as "pending" | "approved")
            : undefined,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword, fiscalYear, endUserType, appStatus, setFilter]);

  const handleReset = () => {
    setKeyword("");
    setFiscalYear("all");
    setEndUserType("all");
    setAppStatus("all");
    setFilter({});
  };

  const filterCount = [
    keyword.trim(),
    fiscalYear !== "all",
    endUserType !== "all",
    appStatus !== "all",
  ].filter(Boolean).length;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 border-gray-300 hover:bg-gray-50 dark:border-input dark:hover:bg-accent"
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
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Search
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Search description or source of funds..."
                className="pl-9 pr-9 h-10"
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => setKeyword("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Fiscal Year
            </label>
            <Select value={fiscalYear} onValueChange={setFiscalYear}>
              <SelectTrigger className="h-10 w-full">
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
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              End User
            </label>
            <Select value={endUserType} onValueChange={setEndUserType}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="school">School</SelectItem>
                <SelectItem value="office">Office</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              APP Status
            </label>
            <Select value={appStatus} onValueChange={setAppStatus}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {filterCount > 0 && (
            <div className="flex justify-end">
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={handleReset}
                className="h-9"
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
