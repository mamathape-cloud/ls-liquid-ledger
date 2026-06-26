"use client";

import { useCallback, useEffect, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { formatINR, formatStatus } from "@/lib/utils";
import { CLAIM_STATUSES, BATCH_STATUSES } from "@/lib/constants";

export default function FinanceBatchesPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [events, setEvents] = useState<{ _id: string; name: string }[]>([]);
  const [eventId, setEventId] = useState("");
  const [approvedClaims, setApprovedClaims] = useState<Record<string, unknown>[]>([]);
  const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);
  const [error, setError] = useState("");

  const loadApprovedClaims = useCallback(async () => {
    if (!eventId) {
      setApprovedClaims([]);
      return;
    }
    const res = await fetch(
      `/api/claims?filter.eventId=${eventId}&filter.status=${CLAIM_STATUSES.FINANCE_APPROVED}&filter.unbatched=true&limit=100`
    );
    const d = await res.json();
    setApprovedClaims(d.data || []);
    setSelectedClaimIds([]);
  }, [eventId]);

  useEffect(() => {
    fetch("/api/events?limit=100")
      .then((r) => r.json())
      .then((d) => setEvents(d.data || []));
  }, []);

  useEffect(() => {
    loadApprovedClaims();
  }, [loadApprovedClaims, refreshKey]);

  const toggleClaim = (id: string) => {
    setSelectedClaimIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const submitBatch = async () => {
    setError("");
    if (!eventId || !selectedClaimIds.length) {
      setError("Select an event and at least one claim");
      return;
    }
    const res = await fetch("/api/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, claimIds: selectedClaimIds }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.message || "Failed to create batch");
      return;
    }
    setSelectedClaimIds([]);
    setRefreshKey((k) => k + 1);
    await loadApprovedClaims();
  };

  const exportPayout = (batchId: string) => {
    window.open(`/api/batches/${batchId}/export`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Approval Batches</h1>

      <Card>
        <h2 className="mb-4 font-semibold">Club Claims for Director Approval</h2>
        <div className="mb-4 max-w-md">
          <Label>Select Event</Label>
          <Select value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">Choose event</option>
            {events.map((e) => (
              <option key={e._id} value={e._id}>{e.name}</option>
            ))}
          </Select>
        </div>
        {approvedClaims.length > 0 ? (
          <div className="space-y-2">
            {approvedClaims.map((c) => (
              <label key={String(c._id)} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedClaimIds.includes(String(c._id))}
                  onChange={() => toggleClaim(String(c._id))}
                />
                {String(c.claimId)} — {String(c.employeeName)} — {formatINR(Number(c.amount))}
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            {eventId
              ? "No finance-approved unbatched claims for this event."
              : "Select an event to view claims."}
          </p>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <Button className="mt-4" onClick={submitBatch}>Submit Batch to Director</Button>
      </Card>

      <Card>
        <DataTable
          endpoint="/api/batches"
          exportTable="batches"
          refreshKey={refreshKey}
          filters={[
            {
              key: "status",
              label: "All Status",
              options: Object.values(BATCH_STATUSES).map((s) => ({
                label: formatStatus(s),
                value: s,
              })),
            },
          ]}
          columns={[
            { key: "batchId", header: "Batch ID" },
            { key: "eventName", header: "Event" },
            {
              key: "totalAmount",
              header: "Total",
              render: (r) => formatINR(Number(r.totalAmount || 0)),
            },
            {
              key: "status",
              header: "Status",
              render: (r) => formatStatus(String(r.status)),
            },
            {
              key: "export",
              header: "Export",
              render: (r) =>
                r.status === BATCH_STATUSES.DIRECTOR_APPROVED ? (
                  <Button
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportPayout(String(r._id));
                    }}
                  >
                    Download Excel
                  </Button>
                ) : null,
            },
          ]}
        />
      </Card>
    </div>
  );
}
