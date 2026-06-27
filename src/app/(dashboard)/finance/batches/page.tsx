"use client";

import { useCallback, useEffect, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { BatchClaimSelector } from "@/components/BatchClaimSelector";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/layout/ThunderModules";
import { formatINR, formatStatus } from "@/lib/utils";
import { downloadFile } from "@/lib/download";
import { CLAIM_STATUSES, BATCH_STATUSES } from "@/lib/constants";

export default function FinanceBatchesPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [events, setEvents] = useState<{ _id: string; name: string }[]>([]);
  const [eventId, setEventId] = useState("");
  const [approvedClaims, setApprovedClaims] = useState<Record<string, unknown>[]>([]);
  const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadApprovedClaims = useCallback(async () => {
    if (!eventId) {
      setApprovedClaims([]);
      return;
    }
    setLoadingClaims(true);
    try {
      const res = await fetch(
        `/api/claims?filter.eventId=${eventId}&filter.status=${CLAIM_STATUSES.FINANCE_APPROVED}&filter.unbatched=true&limit=500`
      );
      const d = await res.json();
      setApprovedClaims(d.data || []);
      setSelectedClaimIds([]);
    } finally {
      setLoadingClaims(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetch("/api/events?limit=200")
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
    setSubmitting(true);
    try {
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
    } finally {
      setSubmitting(false);
    }
  };

  const exportPayout = async (batchId: string) => {
    try {
      await downloadFile(`/api/batches/${batchId}/export`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Export failed");
    }
  };

  const selectorClaims = approvedClaims.map((c) => ({
    _id: String(c._id),
    claimId: String(c.claimId),
    employeeName: String(c.employeeName || ""),
    amount: Number(c.amount),
    claimDate: c.claimDate ? String(c.claimDate) : undefined,
    categoryName: c.categoryName ? String(c.categoryName) : undefined,
    reason: c.reason ? String(c.reason) : undefined,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Approval Batches" />

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

        {loadingClaims ? (
          <p className="text-sm text-slate-500">Loading claims...</p>
        ) : approvedClaims.length > 0 ? (
          <BatchClaimSelector
            claims={selectorClaims}
            selectedIds={selectedClaimIds}
            onToggle={toggleClaim}
            onSelectAll={setSelectedClaimIds}
            onClear={() => setSelectedClaimIds([])}
          />
        ) : (
          <p className="text-sm text-slate-500">
            {eventId
              ? "No finance-approved unbatched claims for this event."
              : "Select an event to view claims."}
          </p>
        )}

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <Button className="mt-4" onClick={submitBatch} disabled={submitting || !selectedClaimIds.length}>
          {submitting ? "Submitting..." : `Submit Batch to Director (${selectedClaimIds.length})`}
        </Button>
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
