"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ClaimStatusCell } from "@/components/ClaimStatusCell";
import { ProofLinks } from "@/components/ProofLinks";
import { ClickableId } from "@/components/ClickableId";
import { formatINR, formatDate } from "@/lib/utils";

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

interface BatchDetailModalProps {
  batchMongoId: string | null;
  batchLabel?: string;
  open: boolean;
  onClose: () => void;
  onClaimClick?: (claimMongoId: string) => void;
}

export function BatchDetailModal({
  batchMongoId,
  batchLabel,
  open,
  onClose,
  onClaimClick,
}: BatchDetailModalProps) {
  const [claims, setClaims] = useState<BatchClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvedLabel, setResolvedLabel] = useState(batchLabel || "");

  useEffect(() => {
    if (!open || !batchMongoId) {
      setClaims([]);
      return;
    }
    setLoading(true);
    fetch(`/api/batches/${batchMongoId}`)
      .then((r) => r.json())
      .then((d) => {
        setClaims(d.claims || []);
        setResolvedLabel(batchLabel || d.batch?.batchId || "");
      })
      .finally(() => setLoading(false));
  }, [open, batchMongoId, batchLabel]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Batch Details — ${resolvedLabel}`}
    >
      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : claims.length === 0 ? (
        <p className="text-sm text-slate-500">No claims in this batch.</p>
      ) : (
        <div className="max-h-[60vh] overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2">Claim ID</th>
                <th className="px-2 py-2">Employee</th>
                <th className="px-2 py-2">Amount</th>
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Category</th>
                <th className="px-2 py-2">Reason</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Rejection Reason</th>
                <th className="px-2 py-2">Proof</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((claim) => (
                <tr key={claim._id} className="border-b align-top">
                  <td className="px-2 py-2">
                    {onClaimClick ? (
                      <ClickableId
                        label={claim.claimId}
                        onClick={() => onClaimClick(claim._id)}
                      />
                    ) : (
                      claim.claimId
                    )}
                  </td>
                  <td className="px-2 py-2">{claim.employeeId?.name || "-"}</td>
                  <td className="px-2 py-2 whitespace-nowrap">{formatINR(claim.amount)}</td>
                  <td className="px-2 py-2 whitespace-nowrap">{formatDate(claim.claimDate)}</td>
                  <td className="px-2 py-2">{claim.categoryId?.name || "-"}</td>
                  <td className="px-2 py-2 max-w-[12rem]">{claim.reason}</td>
                  <td className="px-2 py-2">
                    {claim.status ? (
                      <ClaimStatusCell
                        status={claim.status}
                        financeRejectionReason={claim.financeRejectionReason}
                        directorRejectionReason={claim.directorRejectionReason}
                      />
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-2 py-2 max-w-[12rem] text-slate-600">
                    {claim.directorRejectionReason || claim.financeRejectionReason || "-"}
                  </td>
                  <td className="px-2 py-2">
                    <ProofLinks files={claim.proofFiles} truncateAt={12} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Button className="mt-4 w-full" variant="ghost" onClick={onClose}>
        Close
      </Button>
    </Modal>
  );
}
