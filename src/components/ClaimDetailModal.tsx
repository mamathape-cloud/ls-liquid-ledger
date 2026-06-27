"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ProofLinks } from "@/components/ProofLinks";
import { ClaimStatusCell } from "@/components/ClaimStatusCell";
import { formatINR, formatDate } from "@/lib/utils";
import { CLAIM_STATUSES } from "@/lib/constants";

interface ClaimDetail {
  claimId: string;
  amount: number;
  claimDate: string;
  reason: string;
  status: string;
  proofFiles?: { originalName: string; storedPath: string }[];
  financeRejectionReason?: string;
  directorRejectionReason?: string;
  financeReviewedAt?: string;
  paymentRef?: string;
  disbursedAt?: string;
  eventId?: { name?: string } | string;
  employeeId?: { name?: string; phone?: string } | string;
  categoryId?: { name?: string } | string;
  financeReviewerId?: { name?: string } | string;
  disbursedBy?: { name?: string } | string;
}

interface ClaimDetailModalProps {
  claimId: string | null;
  open: boolean;
  onClose: () => void;
  showEmployee?: boolean;
}

function populatedName(field: { name?: string } | string | undefined) {
  if (!field) return "-";
  if (typeof field === "object") return field.name || "-";
  return String(field);
}

export function ClaimDetailModal({
  claimId,
  open,
  onClose,
  showEmployee = false,
}: ClaimDetailModalProps) {
  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !claimId) {
      setClaim(null);
      return;
    }
    setLoading(true);
    fetch(`/api/claims/${claimId}`)
      .then((r) => r.json())
      .then((d) => setClaim(d.claim || null))
      .finally(() => setLoading(false));
  }, [open, claimId]);

  return (
    <Modal open={open} onClose={onClose} title={claim ? `Claim ${claim.claimId}` : "Claim Details"}>
      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : !claim ? (
        <p className="text-sm text-slate-500">Claim not found.</p>
      ) : (
        <div className="max-h-[65vh] space-y-3 overflow-y-auto text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-slate-900">{claim.claimId}</span>
            <ClaimStatusCell
              status={claim.status}
              financeRejectionReason={claim.financeRejectionReason}
              directorRejectionReason={claim.directorRejectionReason}
            />
          </div>

          <dl className="grid gap-2 md:grid-cols-2">
            {showEmployee && (
              <div>
                <dt className="text-slate-500">Employee</dt>
                <dd className="font-medium">{populatedName(claim.employeeId)}</dd>
              </div>
            )}
            <div>
              <dt className="text-slate-500">Event</dt>
              <dd className="font-medium">{populatedName(claim.eventId)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Amount</dt>
              <dd className="font-medium">{formatINR(claim.amount)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Claim Date</dt>
              <dd className="font-medium">{formatDate(claim.claimDate)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Category</dt>
              <dd className="font-medium">{populatedName(claim.categoryId)}</dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-slate-500">Reason / Purpose</dt>
              <dd className="font-medium">{claim.reason}</dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-slate-500">Proof Attachments</dt>
              <dd className="mt-1">
                <ProofLinks files={claim.proofFiles} />
              </dd>
            </div>
          </dl>

          {claim.status === CLAIM_STATUSES.FINANCE_REJECTED && claim.financeRejectionReason && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="font-medium text-red-800">Finance Rejection Reason</p>
              <p className="mt-1 text-red-700">{claim.financeRejectionReason}</p>
              {claim.financeReviewedAt && (
                <p className="mt-1 text-xs text-red-600">
                  Reviewed on {formatDate(claim.financeReviewedAt)}
                  {claim.financeReviewerId && ` by ${populatedName(claim.financeReviewerId)}`}
                </p>
              )}
            </div>
          )}

          {claim.status === CLAIM_STATUSES.DIRECTOR_REJECTED && claim.directorRejectionReason && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="font-medium text-red-800">Director Rejection Reason</p>
              <p className="mt-1 text-red-700">{claim.directorRejectionReason}</p>
            </div>
          )}

          {claim.status === CLAIM_STATUSES.DISBURSED && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="font-medium text-green-800">Payment Details</p>
              <p className="mt-1 text-green-700">
                <span className="text-slate-600">UTR / Transaction Ref: </span>
                <span className="font-mono font-semibold">{claim.paymentRef || "-"}</span>
              </p>
              {claim.disbursedAt && (
                <p className="mt-1 text-sm text-green-700">
                  Disbursed on {formatDate(claim.disbursedAt)}
                  {claim.disbursedBy && ` by ${populatedName(claim.disbursedBy)}`}
                </p>
              )}
            </div>
          )}

          {(
            [
              CLAIM_STATUSES.FINANCE_APPROVED,
              CLAIM_STATUSES.IN_DIRECTOR_REVIEW,
              CLAIM_STATUSES.DIRECTOR_APPROVED,
              CLAIM_STATUSES.DISBURSED,
            ] as string[]
          ).includes(claim.status) &&
            claim.financeReviewedAt && (
              <div className="rounded-lg border border-[var(--primary-muted)]/40 bg-[var(--primary-soft)] p-3">
                <p className="font-medium text-[var(--primary-hover)]">Finance Approval</p>
                <p className="mt-1 text-sm text-[var(--primary)]">
                  Approved on {formatDate(claim.financeReviewedAt)}
                  {claim.financeReviewerId && ` by ${populatedName(claim.financeReviewerId)}`}
                </p>
              </div>
            )}
        </div>
      )}
      <Button className="mt-4 w-full" variant="ghost" onClick={onClose}>
        Close
      </Button>
    </Modal>
  );
}
