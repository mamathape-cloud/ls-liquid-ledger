"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatINR, formatDate } from "@/lib/utils";

interface ClaimRow {
  _id: string;
  claimId: string;
  employeeName?: string;
  amount: number;
  claimDate?: string;
  categoryName?: string;
  reason?: string;
}

interface BatchClaimSelectorProps {
  claims: ClaimRow[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onClear: () => void;
}

const PAGE_SIZE = 25;

export function BatchClaimSelector({
  claims,
  selectedIds,
  onToggle,
  onSelectAll,
  onClear,
}: BatchClaimSelectorProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return claims;
    return claims.filter(
      (c) =>
        c.claimId.toLowerCase().includes(q) ||
        (c.employeeName || "").toLowerCase().includes(q) ||
        (c.reason || "").toLowerCase().includes(q)
    );
  }, [claims, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pageIds = pageRows.map((c) => c._id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const selectedAmount = claims
    .filter((c) => selectedIds.includes(c._id))
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);

  const togglePage = () => {
    if (allPageSelected) {
      onSelectAll(selectedIds.filter((id) => !pageIds.includes(id)));
    } else {
      onSelectAll([...new Set([...selectedIds, ...pageIds])]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search by claim ID, employee, or reason..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="sm:max-w-md"
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" type="button" onClick={() => onSelectAll(claims.map((c) => c._id))}>
            Select all ({claims.length})
          </Button>
          <Button variant="ghost" type="button" onClick={onClear}>
            Clear selection
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 sm:px-4">
        <span className="font-medium">{selectedIds.length}</span> of {claims.length} claims selected
        {selectedIds.length > 0 && (
          <span className="ml-3 text-slate-600">Total: {formatINR(selectedAmount)}</span>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-3 py-3 sm:px-4">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={togglePage}
                  aria-label="Select all on this page"
                />
              </th>
              <th className="px-3 py-3 font-medium sm:px-4">Claim ID</th>
              <th className="px-3 py-3 font-medium sm:px-4">Employee</th>
              <th className="px-3 py-3 font-medium sm:px-4">Amount</th>
              <th className="hidden px-3 py-3 font-medium md:table-cell sm:px-4">Date</th>
              <th className="hidden px-3 py-3 font-medium lg:table-cell sm:px-4">Category</th>
              <th className="hidden px-3 py-3 font-medium xl:table-cell sm:px-4">Reason</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No claims match your search.
                </td>
              </tr>
            ) : (
              pageRows.map((c) => {
                const checked = selectedIds.includes(c._id);
                return (
                  <tr
                    key={c._id}
                    className={`border-t cursor-pointer transition ${checked ? "bg-[var(--primary-soft)]" : "hover:bg-slate-50"}`}
                    onClick={() => onToggle(c._id)}
                  >
                    <td className="px-3 py-3 sm:px-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggle(c._id)}
                        aria-label={`Select claim ${c.claimId}`}
                      />
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-900 sm:px-4">{c.claimId}</td>
                    <td className="px-3 py-3 sm:px-4">{c.employeeName || "-"}</td>
                    <td className="px-3 py-3 sm:px-4">{formatINR(Number(c.amount))}</td>
                    <td className="hidden px-3 py-3 md:table-cell sm:px-4">
                      {c.claimDate ? formatDate(c.claimDate) : "-"}
                    </td>
                    <td className="hidden px-3 py-3 lg:table-cell sm:px-4">{c.categoryName || "-"}</td>
                    <td className="hidden max-w-xs truncate px-3 py-3 xl:table-cell sm:px-4">{c.reason || "-"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Page {safePage} of {totalPages} ({filtered.length} claims)
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
