"use client";

import { useEffect, useRef, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import { ProofLinks } from "@/components/ProofLinks";
import { ClaimStatusCell } from "@/components/ClaimStatusCell";
import { formatINR, formatDate, formatStatus } from "@/lib/utils";
import { BATCH_STATUSES } from "@/lib/constants";
import { PageHeader } from "@/components/layout/ThunderModules";

interface BatchClaim {
  _id: string;
  claimId: string;
  amount: number;
  claimDate: string;
  reason: string;
  status?: string;
  financeRejectionReason?: string;
  directorRejectionReason?: string;
  proofFiles?: { originalName: string; storedPath: string }[];
  employeeId?: { name?: string };
  categoryId?: { name?: string };
}

const DIRECTOR_BATCH_STATUS_OPTIONS = [
  BATCH_STATUSES.SUBMITTED,
  BATCH_STATUSES.DIRECTOR_APPROVED,
  BATCH_STATUSES.DIRECTOR_REJECTED,
] as const;

export default function DirectorBatchesPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [reviewBatch, setReviewBatch] = useState<Record<string, unknown> | null>(null);
  const [viewBatch, setViewBatch] = useState<Record<string, unknown> | null>(null);
  const [batchClaims, setBatchClaims] = useState<BatchClaim[]>([]);
  const [viewClaims, setViewClaims] = useState<BatchClaim[]>([]);
  const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionSuggestions, setRejectionSuggestions] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [loadingView, setLoadingView] = useState(false);
  const reviewSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!reviewBatch) {
      setBatchClaims([]);
      setSelectedClaimIds([]);
      return;
    }
    setLoadingClaims(true);
    fetch(`/api/batches/${reviewBatch._id}`)
      .then((r) => r.json())
      .then((d) => {
        const claims = d.claims || [];
        setBatchClaims(claims);
        setSelectedClaimIds(claims.map((c: BatchClaim) => c._id));
      })
      .finally(() => setLoadingClaims(false));
  }, [reviewBatch]);

  useEffect(() => {
    if (!viewBatch) {
      setViewClaims([]);
      return;
    }
    setLoadingView(true);
    fetch(`/api/batches/${viewBatch._id}`)
      .then((r) => r.json())
      .then((d) => setViewClaims(d.claims || []))
      .finally(() => setLoadingView(false));
  }, [viewBatch]);

  useEffect(() => {
    if (!reviewBatch) return;
    const timer = setTimeout(() => {
      reviewSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => clearTimeout(timer);
  }, [reviewBatch]);

  useEffect(() => {
    if (!rejectionReason || rejectionReason.length < 2) {
      setRejectionSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/claims/reasons?type=rejection&q=${encodeURIComponent(rejectionReason)}`)
        .then((r) => r.json())
        .then((d) => setRejectionSuggestions(d.suggestions || []));
    }, 300);
    return () => clearTimeout(timer);
  }, [rejectionReason]);

  const toggleClaim = (id: string) => {
    setSelectedClaimIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedClaimIds(batchClaims.map((c) => c._id));
  };

  const openReview = (row: Record<string, unknown>) => {
    setReviewBatch(row);
    setRejectionReason("");
    setRejectionSuggestions([]);
    setError("");
  };

  const submitReview = async () => {
    if (!reviewBatch) return;
    setError("");
    const rejectedCount = batchClaims.length - selectedClaimIds.length;
    if (rejectedCount > 0 && !rejectionReason.trim()) {
      setError("Rejection reason is required for claims that are not selected");
      return;
    }
    if (selectedClaimIds.length === 0 && !rejectionReason.trim()) {
      setError("Rejection reason is required when rejecting all claims");
      return;
    }

    const res = await fetch(`/api/batches/${reviewBatch._id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvedClaimIds: selectedClaimIds, rejectionReason }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.message || "Action failed");
      return;
    }
    setReviewBatch(null);
    setRejectionReason("");
    setRejectionSuggestions([]);
    setRefreshKey((k) => k + 1);
  };

  const rejectedCount = batchClaims.length - selectedClaimIds.length;
  const needsRejectionReason = rejectedCount > 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Director Batches" />
      <Card>
        <DataTable
          endpoint="/api/batches"
          refreshKey={refreshKey}
          filters={[
            {
              key: "status",
              label: "All Status",
              options: DIRECTOR_BATCH_STATUS_OPTIONS.map((s) => ({
                label: formatStatus(s),
                value: s,
              })),
            },
          ]}
          columns={[
            { key: "batchId", header: "Batch ID" },
            { key: "eventName", header: "Event" },
            { key: "totalAmount", header: "Total", render: (r) => formatINR(Number(r.totalAmount || 0)) },
            { key: "status", header: "Status", render: (r) => formatStatus(String(r.status)) },
            {
              key: "actions",
              header: "Actions",
              render: (r) => (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewBatch(r);
                    }}
                  >
                    View
                  </Button>
                  {r.status === BATCH_STATUSES.SUBMITTED && (
                    <Button
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        openReview(r);
                      }}
                    >
                      Review
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={!!viewBatch}
        onClose={() => setViewBatch(null)}
        title={`Batch Details — ${String(viewBatch?.batchId || "")}`}
      >
        {loadingView ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : viewClaims.length === 0 ? (
          <p className="text-sm text-slate-500">No claims in this batch.</p>
        ) : (
          <div className="max-h-[60vh] space-y-3 overflow-y-auto">
            {viewClaims.map((c) => (
              <div key={c._id} className="rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-medium">{c.claimId} — {formatINR(c.amount)}</p>
                  {c.status && (
                    <ClaimStatusCell
                      status={c.status}
                      financeRejectionReason={c.financeRejectionReason}
                      directorRejectionReason={c.directorRejectionReason}
                    />
                  )}
                </div>
                <p className="text-slate-500">
                  {c.employeeId?.name} · {c.categoryId?.name} · {formatDate(c.claimDate)}
                </p>
                <p className="mt-1 text-slate-600">{c.reason}</p>
                <div className="mt-2">
                  <span className="text-slate-500">Proof: </span>
                  <ProofLinks files={c.proofFiles} />
                </div>
              </div>
            ))}
          </div>
        )}
        <Button className="mt-4 w-full" variant="ghost" onClick={() => setViewBatch(null)}>
          Close
        </Button>
      </Modal>

      {reviewBatch && (
        <div ref={reviewSectionRef} className="scroll-mt-6">
        <Card>
          <h2 className="mb-4 font-semibold">Review Batch {String(reviewBatch.batchId)}</h2>
          <p className="mb-4 text-sm text-slate-600">
            Select the claims to approve. Unselected claims will be rejected.
          </p>

          <div className="mb-3">
            <Button variant="secondary" onClick={selectAll}>Select All</Button>
          </div>

          {loadingClaims ? (
            <p className="text-sm text-slate-500">Loading claims...</p>
          ) : (
            <div className="space-y-2 rounded-lg border p-4">
              {batchClaims.map((c) => (
                <label key={c._id} className="flex items-start gap-3 border-b pb-2 text-sm last:border-0">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selectedClaimIds.includes(c._id)}
                    onChange={() => toggleClaim(c._id)}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{c.claimId} — {formatINR(c.amount)}</p>
                    <p className="text-slate-500">
                      {c.employeeId?.name} · {c.categoryId?.name} · {formatDate(c.claimDate)}
                    </p>
                    <p className="text-slate-600">{c.reason}</p>
                    <div className="mt-1">
                      <ProofLinks files={c.proofFiles} />
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}

          {needsRejectionReason && (
            <div className="relative mt-4">
              <Label required>
                {selectedClaimIds.length === 0
                  ? "Rejection Reason (rejecting all claims)"
                  : `Rejection Reason for ${rejectedCount} unselected claim(s)`}
              </Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection"
              />
              {rejectionSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border bg-white shadow">
                  {rejectionSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() => {
                        setRejectionReason(s);
                        setRejectionSuggestions([]);
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

          <div className="mt-4 flex gap-2">
            <Button onClick={submitReview}>
              {selectedClaimIds.length === batchClaims.length
                ? "Approve All"
                : selectedClaimIds.length === 0
                  ? "Reject All"
                  : "Submit Review"}
            </Button>
            <Button variant="ghost" onClick={() => setReviewBatch(null)}>Cancel</Button>
          </div>
        </Card>
        </div>
      )}
    </div>
  );
}
