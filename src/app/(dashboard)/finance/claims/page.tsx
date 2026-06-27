"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { ProofLinks } from "@/components/ProofLinks";
import { ClaimStatusCell } from "@/components/ClaimStatusCell";
import { ClaimDetailModal } from "@/components/ClaimDetailModal";
import { PageHeader } from "@/components/layout/ThunderModules";
import { formatINR, formatDate, formatStatus } from "@/lib/utils";
import { CLAIM_STATUSES } from "@/lib/constants";

interface ProofFile {
  originalName: string;
  storedPath: string;
  mimeType: string;
}

export default function FinanceClaimsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [claimDetails, setClaimDetails] = useState<{
    proofFiles?: ProofFile[];
    reason?: string;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionError, setActionError] = useState("");
  const [viewClaimId, setViewClaimId] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) {
      setClaimDetails(null);
      return;
    }
    fetch(`/api/claims/${selected._id}`)
      .then((r) => r.json())
      .then((d) => setClaimDetails(d.claim));
  }, [selected]);

  const openReview = (row: Record<string, unknown>) => {
    setSelected(row);
    setRejectionReason("");
    setActionError("");
  };

  const review = async (action: "approve" | "reject") => {
    if (!selected) return;
    setActionError("");
    if (action === "reject" && !rejectionReason.trim()) {
      setActionError("Rejection reason is required");
      return;
    }
    const res = await fetch(`/api/claims/${selected._id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, rejectionReason }),
    });
    const json = await res.json();
    if (!res.ok) {
      setActionError(json.message || "Action failed");
      return;
    }
    setSelected(null);
    setRejectionReason("");
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Review Claims" />

      <Card>
        <DataTable
          endpoint="/api/claims"
          exportTable="claims"
          refreshKey={refreshKey}
          filters={[
            {
              key: "status",
              label: "All Status",
              options: Object.values(CLAIM_STATUSES).map((s) => ({
                label: formatStatus(s),
                value: s,
              })),
            },
          ]}
          columns={[
            { key: "claimId", header: "Claim ID" },
            { key: "employeeName", header: "Employee" },
            { key: "eventName", header: "Event" },
            { key: "amount", header: "Amount", render: (r) => formatINR(Number(r.amount)) },
            { key: "claimDate", header: "Date", render: (r) => formatDate(String(r.claimDate)) },
            { key: "categoryName", header: "Category" },
            {
              key: "proofFiles",
              header: "Proof",
              render: (r) => <ProofLinks files={r.proofFiles} />,
            },
            {
              key: "status",
              header: "Status",
              render: (r) => (
                <ClaimStatusCell
                  status={String(r.status)}
                  financeRejectionReason={r.financeRejectionReason as string | undefined}
                  directorRejectionReason={r.directorRejectionReason as string | undefined}
                />
              ),
            },
            {
              key: "actions",
              header: "Actions",
              render: (r) => (
                <div className="flex gap-2">
                  {r.status === CLAIM_STATUSES.SUBMITTED ? (
                    <Button variant="secondary" onClick={(e) => { e.stopPropagation(); openReview(r); }}>
                      Review
                    </Button>
                  ) : (
                    <Button variant="secondary" onClick={(e) => { e.stopPropagation(); setViewClaimId(String(r._id)); }}>
                      View
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>

      {selected && (
        <Card>
          <h2 className="mb-4 font-semibold">Review Claim {String(selected.claimId)}</h2>
          <p className="text-sm text-slate-600">Reason: {claimDetails?.reason || String(selected.reason)}</p>
          <p className="mt-1 text-sm text-slate-600">Amount: {formatINR(Number(selected.amount))}</p>

          {claimDetails?.proofFiles && claimDetails.proofFiles.length > 0 && (
            <div className="mt-4">
              <Label>Proof Attachments</Label>
              <ul className="mt-2 space-y-2">
                {claimDetails.proofFiles.map((file) => (
                  <li key={file.storedPath}>
                    <a
                      href={`/api/uploads/${file.storedPath}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[var(--primary)] hover:underline"
                    >
                      {file.originalName}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4">
            <Label>Rejection Reason (required if rejecting)</Label>
            <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
            {actionError && <p className="mt-1 text-sm text-red-600">{actionError}</p>}
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => review("approve")}>Approve</Button>
            <Button variant="danger" onClick={() => review("reject")}>Reject</Button>
            <Button variant="ghost" onClick={() => setSelected(null)}>Cancel</Button>
          </div>
        </Card>
      )}

      <ClaimDetailModal
        claimId={viewClaimId}
        open={!!viewClaimId}
        onClose={() => setViewClaimId(null)}
        showEmployee
      />
    </div>
  );
}
