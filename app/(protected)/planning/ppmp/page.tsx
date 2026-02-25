"use client";

import { TableSkeleton } from "@/components/TableSkeleton";
import { Button } from "@/components/ui/button";
import { PER_PAGE } from "@/lib/constants";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hook";
import { addList } from "@/lib/redux/listSlice";
import { supabase } from "@/lib/supabase/client";
import { PPMP } from "@/types/database";
import { FileText, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AddModal } from "./AddModal";
import { Filter, type PPMPFilter } from "./Filter";
import { List } from "./List";

export default function PPMPPage() {
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [modalAddOpen, setModalAddOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<PPMPFilter>({});

  const dispatch = useAppDispatch();
  const list = useAppSelector((state) => state.list.value);

  const handleFilterChange = useCallback((newFilter: PPMPFilter) => {
    setFilter(newFilter);
    setPage(1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    dispatch(addList([]));

    const fetchData = async () => {
      setLoading(true);
      let query = supabase
        .from("ppmp")
        .select(
          "*, school:schools!school_id(id, name), office:offices!office_id(id, name), ppmp_rows(app_status)",
          { count: "exact" },
        );

      if (filter.fiscalYear != null) {
        query = query.eq("fiscal_year", filter.fiscalYear);
      }

      if (filter.endUserType) {
        query = query.eq("end_user_type", filter.endUserType);
      }

      const { data, count, error } = await query
        .range((page - 1) * PER_PAGE, page * PER_PAGE - 1)
        .order("fiscal_year", { ascending: false })
        .order("id", { ascending: false });

      if (!isMounted) return;

      if (error) {
        console.error(error);
      } else {
        dispatch(addList((data ?? []) as PPMP[]));
        setTotalCount(count ?? 0);
      }
      setLoading(false);
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [page, filter, dispatch]);

  return (
    <div>
      <div className="app__title">
        <h1 className="app__title_text flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Project Procurement Management Plan (PPMP)
        </h1>
        <div className="app__title_actions">
          <Filter filter={filter} setFilter={handleFilterChange} />
          <Button
            variant="green"
            onClick={() => setModalAddOpen(true)}
            size="sm"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add PPMP
          </Button>
        </div>
      </div>
      <div className="app__content">
        {loading ? (
          <TableSkeleton />
        ) : list.length === 0 ? (
          <div className="app__empty_state">
            <div className="app__empty_state_icon">
              <FileText className="mx-auto h-12 w-12" />
            </div>
            <p className="app__empty_state_title">No PPMPs found</p>
            <p className="app__empty_state_description">
              {filter.fiscalYear ?? filter.endUserType
                ? "Try adjusting your filters"
                : "Get started by adding a new PPMP"}
            </p>
          </div>
        ) : (
          <List />
        )}

        {totalCount > 0 && totalCount > PER_PAGE && (
          <div className="app__pagination">
            <div className="app__pagination_info">
              Page <span className="font-medium">{page}</span> of{" "}
              <span className="font-medium">
                {Math.ceil(totalCount / PER_PAGE)}
              </span>
            </div>
            <div className="app__pagination_controls">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={page === 1 || loading}
                className="h-9 min-w-[80px]"
              >
                Previous
              </Button>
              <div className="app__pagination_page_numbers">
                {Array.from(
                  { length: Math.min(5, Math.ceil(totalCount / PER_PAGE)) },
                  (_, i) => {
                    const totalPages = Math.ceil(totalCount / PER_PAGE);
                    const pageNum =
                      totalPages <= 5
                        ? i + 1
                        : page <= 3
                          ? i + 1
                          : page >= totalPages - 2
                            ? totalPages - 4 + i
                            : page - 2 + i;

                    return (
                      <Button
                        key={pageNum}
                        size="sm"
                        variant={page === pageNum ? "default" : "outline"}
                        onClick={() => setPage(pageNum)}
                        disabled={loading}
                        className="h-9 w-9 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  },
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page * PER_PAGE >= totalCount || loading}
                className="h-9 min-w-[80px]"
              >
                Next
              </Button>
            </div>
          </div>
        )}
        <AddModal
          isOpen={modalAddOpen}
          onClose={() => setModalAddOpen(false)}
        />
      </div>
    </div>
  );
}
