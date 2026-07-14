"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { ProofLinks } from "@/components/ProofLinks";
import { ClaimStatusCell } from "@/components/ClaimStatusCell";
import { PageHeader } from "@/components/layout/ThunderModules";
import { formatINR, formatDate } from "@/lib/utils";

export default function SearchPage() {
  const [claimId, setClaimId] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!claimId || claimId.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/claims/suggest?q=${encodeURIComponent(claimId)}`)
        .then((r) => r.json())
        .then((d) => {
          const items = (d.suggestions || []) as string[];
          setSuggestions(
            items.filter((s) => s.toLowerCase() !== claimId.trim().toLowerCase())
          );
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [claimId]);

  const search = async (id?: string) => {
    const query = (id ?? claimId).trim();
    if (!query) return;
    const res = await fetch(`/api/claims?claimId=${encodeURIComponent(query)}&limit=10`);
    const json = await res.json();
    setResults(json.data || []);
    setSearched(true);
    setSuggestions([]);
  };

  const clearFilters = () => {
    setClaimId("");
    setSuggestions([]);
    setResults([]);
    setSearched(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Track Claim" />
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div className="relative min-w-[280px] flex-1">
            <Label required>Claim ID</Label>
            <Input
              value={claimId}
              onChange={(e) => setClaimId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="e.g. LL-2026-000123"
            />
            {suggestions.length > 0 && (
              <div className="absolute z-40 mt-1 max-h-[min(16rem,calc(100dvh-14rem))] w-full overflow-y-auto overscroll-contain rounded-lg border bg-white shadow-lg">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() => {
                      setClaimId(s);
                      setSuggestions([]);
                      search(s);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button onClick={() => search()}>Search</Button>
          {(claimId || searched) && (
            <Button type="button" variant="ghost" onClick={clearFilters}>
              Clear All
            </Button>
          )}
        </div>
      </Card>

      {searched && (
        <Card>
          {results.length === 0 ? (
            <p className="text-slate-500">No claims found for this ID.</p>
          ) : (
            <div className="space-y-4">
              {results.map((c) => (
                <div key={String(c._id)} className="rounded-lg border p-4">
                  <div className="flex flex-wrap justify-between gap-2">
                    <h3 className="font-semibold text-[var(--primary)]">{String(c.claimId)}</h3>
                    <ClaimStatusCell
                      status={String(c.status)}
                      financeRejectionReason={c.financeRejectionReason as string | undefined}
                      directorRejectionReason={c.directorRejectionReason as string | undefined}
                    />
                  </div>
                  <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                    <p><span className="text-slate-500">Employee:</span> {String(c.employeeName || "-")}</p>
                    <p><span className="text-slate-500">Event:</span> {String(c.eventName || "-")}</p>
                    <p><span className="text-slate-500">Amount:</span> {formatINR(Number(c.amount))}</p>
                    <p><span className="text-slate-500">Date:</span> {formatDate(String(c.claimDate))}</p>
                    <p><span className="text-slate-500">Category:</span> {String(c.categoryName || "-")}</p>
                    <p><span className="text-slate-500">Reason:</span> {String(c.reason || "-")}</p>
                  </div>
                  <div className="mt-3">
                    <span className="text-sm text-slate-500">Proof: </span>
                    <ProofLinks files={c.proofFiles} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
