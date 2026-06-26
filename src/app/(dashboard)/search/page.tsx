"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { ProofLinks } from "@/components/ProofLinks";
import { ClaimStatusCell } from "@/components/ClaimStatusCell";
import { formatINR, formatDate } from "@/lib/utils";

export default function SearchPage() {
  const [claimId, setClaimId] = useState("");
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    const res = await fetch(`/api/claims?claimId=${encodeURIComponent(claimId)}&limit=10`);
    const json = await res.json();
    setResults(json.data || []);
    setSearched(true);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Track Claim</h1>
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[280px] flex-1">
            <Label>Claim ID</Label>
            <Input
              value={claimId}
              onChange={(e) => setClaimId(e.target.value)}
              placeholder="e.g. LL-2026-000123"
            />
          </div>
          <Button onClick={search}>Search</Button>
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
                    <h3 className="font-semibold text-blue-700">{String(c.claimId)}</h3>
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
