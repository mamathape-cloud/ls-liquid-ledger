"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { PaginationMeta } from "@/types";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
}

export interface FilterOption {
  key: string;
  label: string;
  options: { label: string; value: string }[];
}

interface DataTableProps<T extends Record<string, unknown>> {
  endpoint: string;
  columns: Column<T>[];
  exportTable?: string;
  filters?: FilterOption[];
  extraParams?: Record<string, string>;
  onRowClick?: (row: T) => void;
  refreshKey?: number;
}

const EMPTY_PARAMS: Record<string, string> = {};

export function DataTable<T extends Record<string, unknown>>({
  endpoint,
  columns,
  exportTable,
  filters = [],
  extraParams,
  onRowClick,
  refreshKey = 0,
}: DataTableProps<T>) {
  const [data, setData] = useState<T[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const requestIdRef = useRef(0);
  const extraParamsRef = useRef(extraParams ?? EMPTY_PARAMS);
  extraParamsRef.current = extraParams ?? EMPTY_PARAMS;

  const filterValuesKey = JSON.stringify(filterValues);
  const extraParamsKey = JSON.stringify(extraParams ?? EMPTY_PARAMS);

  // Reset to page 1 when search/filters/refreshKey change
  useEffect(() => {
    setPage(1);
  }, [search, filterValuesKey, extraParamsKey, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      const hasData = data.length > 0;

      if (hasData) {
        setRefreshing(true);
      } else {
        setInitialLoading(true);
      }

      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        search,
        ...extraParamsRef.current,
      });

      Object.entries(filterValues).forEach(([key, value]) => {
        if (value) params.set(`filter.${key}`, value);
      });

      try {
        const res = await fetch(`${endpoint}?${params}`, {
          credentials: "same-origin",
        });

        if (requestId !== requestIdRef.current) return;

        if (!res.ok) {
          console.error(`DataTable fetch failed: ${res.status} ${endpoint}`);
          return;
        }

        const json = await res.json();
        if (requestId !== requestIdRef.current) return;

        setData(Array.isArray(json.data) ? json.data : []);
        setMeta(
          json.meta ?? {
            page,
            limit: 10,
            total: 0,
            totalPages: 1,
          }
        );
      } catch (err) {
        console.error("DataTable fetch error:", err);
      } finally {
        if (requestId === requestIdRef.current) {
          setInitialLoading(false);
          setRefreshing(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // `data.length` intentionally excluded — only used to pick loading UI, not to re-fetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, search, filterValuesKey, extraParamsKey, refreshKey, page]);

  const pages = Array.from({ length: meta.totalPages }, (_, i) => i + 1).slice(
    Math.max(0, meta.page - 3),
    meta.page + 2
  );

  const showInitialLoading = initialLoading && data.length === 0;
  const showEmpty = !showInitialLoading && !refreshing && data.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {filters.map((filter) => (
          <div key={filter.key} className="min-w-[160px]">
            <Select
              value={filterValues[filter.key] || ""}
              onChange={(e) =>
                setFilterValues((prev) => ({ ...prev, [filter.key]: e.target.value }))
              }
            >
              <option value="">{filter.label}</option>
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
        ))}
        {exportTable && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => window.open(`/api/export?table=${exportTable}&format=csv`)}
            >
              Export CSV
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.open(`/api/export?table=${exportTable}&format=xlsx`)}
            >
              Export Excel
            </Button>
          </div>
        )}
      </div>

      <div className="relative overflow-x-auto rounded-xl border border-slate-200">
        {refreshing && (
          <div className="absolute right-3 top-3 z-10 rounded bg-blue-50 px-2 py-1 text-xs text-blue-600">
            Updating...
          </div>
        )}
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 font-medium">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-slate-900">
            {showInitialLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                  Loading...
                </td>
              </tr>
            ) : showEmpty ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                  No records found
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={String(row._id || row.id || idx)}
                  className="border-t border-slate-100 hover:bg-slate-50"
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-slate-900">
                      {col.render
                        ? col.render(row)
                        : String(row[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing page {meta.page} of {meta.totalPages} ({meta.total} total)
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            disabled={meta.page <= 1 || initialLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          {pages.map((p) => (
            <Button
              key={p}
              variant={p === meta.page ? "primary" : "secondary"}
              disabled={initialLoading}
              onClick={() => setPage(p)}
            >
              {p}
            </Button>
          ))}
          <Button
            variant="secondary"
            disabled={meta.page >= meta.totalPages || initialLoading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
