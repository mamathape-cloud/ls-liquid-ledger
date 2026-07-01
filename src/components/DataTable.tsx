"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { downloadFile } from "@/lib/download";
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
  searchPlaceholder?: string;
}

const EMPTY_PARAMS: Record<string, string> = {};

function renderCell<T extends Record<string, unknown>>(col: Column<T>, row: T) {
  return col.render ? col.render(row) : String(row[col.key] ?? "");
}

function rowKey<T extends Record<string, unknown>>(row: T, idx: number) {
  return String(row._id || row.id || idx);
}

interface DataRowsProps<T extends Record<string, unknown>> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  showInitialLoading: boolean;
  showEmpty: boolean;
  refreshing: boolean;
}

function MobileCardList<T extends Record<string, unknown>>({
  data,
  columns,
  onRowClick,
  showInitialLoading,
  showEmpty,
  refreshing,
}: DataRowsProps<T>) {
  const dataColumns = columns.filter((c) => c.key !== "actions");
  const actionColumn = columns.find((c) => c.key === "actions");

  if (showInitialLoading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-white px-4 py-10 text-center text-sm text-slate-500 md:hidden">
        Loading...
      </div>
    );
  }

  if (showEmpty) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-white px-4 py-10 text-center text-sm text-slate-500 md:hidden">
        No records found
      </div>
    );
  }

  return (
    <div className="relative space-y-3 md:hidden">
      {refreshing && (
        <div className="absolute right-0 top-0 z-10 rounded-lg bg-[var(--primary-soft)] px-2 py-1 text-xs text-[var(--primary)]">
          Updating...
        </div>
      )}
      {data.map((row, idx) => (
        <div
          key={rowKey(row, idx)}
          className={`rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm ${
            onRowClick ? "cursor-pointer active:bg-[var(--primary-soft)]/30" : ""
          }`}
          onClick={() => onRowClick?.(row)}
        >
          {dataColumns.map((col) => (
            <div
              key={col.key}
              className="flex items-start justify-between gap-3 border-b border-[var(--border)] py-2.5 last:border-b-0"
            >
              <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {col.header}
              </span>
              <span className="min-w-0 text-right text-sm text-slate-900">{renderCell(col, row)}</span>
            </div>
          ))}
          {actionColumn?.render && (
            <div
              className="mt-3 flex flex-wrap gap-2 border-t border-[var(--border)] pt-3"
              onClick={(e) => e.stopPropagation()}
            >
              {actionColumn.render(row)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DesktopTable<T extends Record<string, unknown>>({
  data,
  columns,
  onRowClick,
  showInitialLoading,
  showEmpty,
  refreshing,
}: DataRowsProps<T>) {
  return (
    <div className="relative hidden overflow-x-auto rounded-2xl border border-[var(--border)] bg-white shadow-sm md:block">
      {refreshing && (
        <div className="absolute right-3 top-3 z-10 rounded-lg bg-[var(--primary-soft)] px-2 py-1 text-xs text-[var(--primary)]">
          Updating...
        </div>
      )}
      <table className="min-w-full text-sm">
        <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="whitespace-nowrap px-4 py-3 font-semibold">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-slate-900">
          {showInitialLoading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-500">
                Loading...
              </td>
            </tr>
          ) : showEmpty ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-500">
                No records found
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={rowKey(row, idx)}
                className="border-t border-[var(--border)] transition hover:bg-[var(--primary-soft)]/40"
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className="whitespace-nowrap px-4 py-3.5">
                    {renderCell(col, row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function DataTable<T extends Record<string, unknown>>({
  endpoint,
  columns,
  exportTable,
  filters = [],
  extraParams,
  onRowClick,
  refreshKey = 0,
  searchPlaceholder = "Search records...",
}: DataTableProps<T>) {
  const [data, setData] = useState<T[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState<"csv" | "xlsx" | null>(null);

  const requestIdRef = useRef(0);
  const extraParamsRef = useRef(extraParams ?? EMPTY_PARAMS);
  const filterValuesKey = JSON.stringify(filterValues);
  const extraParamsKey = JSON.stringify(extraParams ?? EMPTY_PARAMS);

  useEffect(() => {
    extraParamsRef.current = extraParams ?? EMPTY_PARAMS;
  }, [extraParamsKey, extraParams]);

  useEffect(() => {
    setPage(1);
  }, [search, filterValuesKey, extraParamsKey, refreshKey]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      const hasData = data.length > 0;

      if (hasData) setRefreshing(true);
      else setInitialLoading(true);

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
        const res = await fetch(`${endpoint}?${params}`, { credentials: "same-origin" });
        if (requestId !== requestIdRef.current) return;
        if (!res.ok) return;

        const json = await res.json();
        if (requestId !== requestIdRef.current) return;

        setData(Array.isArray(json.data) ? json.data : []);
        setMeta(json.meta ?? { page, limit: 10, total: 0, totalPages: 1 });
      } catch (err) {
        console.error("DataTable fetch error:", err);
      } finally {
        if (requestId === requestIdRef.current) {
          setInitialLoading(false);
          setRefreshing(false);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, search, filterValuesKey, extraParamsKey, refreshKey, page]);

  const pages = Array.from({ length: meta.totalPages }, (_, i) => i + 1).slice(
    Math.max(0, meta.page - 3),
    meta.page + 2
  );

  const showInitialLoading = initialLoading && data.length === 0;
  const showEmpty = !showInitialLoading && !refreshing && data.length === 0;

  const rowProps: DataRowsProps<T> = {
    data,
    columns,
    onRowClick,
    showInitialLoading,
    showEmpty,
    refreshing,
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-[var(--surface-muted)] p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {filters.map((filter) => (
            <div key={filter.key} className="w-full sm:max-w-[180px]">
              <Select
                value={filterValues[filter.key] || ""}
                onChange={(e) =>
                  setFilterValues((prev) => ({ ...prev, [filter.key]: e.target.value }))
                }
              >
                <option value="">{filter.label}</option>
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>
          ))}
          <div className="flex min-w-0 flex-1 gap-2">
            <Input
              placeholder={searchPlaceholder}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
            />
            <Button type="button" onClick={() => setSearch(searchInput)} className="shrink-0">
              Search
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-[var(--primary)]">Total: {meta.total}</p>
        {exportTable && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!!exporting}
              onClick={async () => {
                setExporting("csv");
                try {
                  await downloadFile(`/api/export?table=${exportTable}&format=csv`);
                } catch (err) {
                  alert(err instanceof Error ? err.message : "Export failed");
                } finally {
                  setExporting(null);
                }
              }}
            >
              {exporting === "csv" ? "..." : "Export CSV"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!!exporting}
              onClick={async () => {
                setExporting("xlsx");
                try {
                  await downloadFile(`/api/export?table=${exportTable}&format=xlsx`);
                } catch (err) {
                  alert(err instanceof Error ? err.message : "Export failed");
                } finally {
                  setExporting(null);
                }
              }}
            >
              {exporting === "xlsx" ? "..." : "Export Excel"}
            </Button>
          </div>
        )}
      </div>

      <MobileCardList {...rowProps} />
      <DesktopTable {...rowProps} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          Page {meta.page} of {meta.totalPages}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" disabled={meta.page <= 1 || initialLoading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Previous
          </Button>
          {pages.map((p) => (
            <Button key={p} variant={p === meta.page ? "primary" : "ghost"} size="sm" disabled={initialLoading} onClick={() => setPage(p)}>
              {p}
            </Button>
          ))}
          <Button variant="ghost" size="sm" disabled={meta.page >= meta.totalPages || initialLoading} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
