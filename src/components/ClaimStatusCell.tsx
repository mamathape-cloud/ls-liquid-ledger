"use client";

import { formatStatus } from "@/lib/utils";
import { CLAIM_STATUSES } from "@/lib/constants";

interface ClaimStatusCellProps {
  status: string;
  financeRejectionReason?: string;
  directorRejectionReason?: string;
}

export function ClaimStatusCell({
  status,
  financeRejectionReason,
  directorRejectionReason,
}: ClaimStatusCellProps) {
  const label = formatStatus(status);
  const isRejected =
    status === CLAIM_STATUSES.FINANCE_REJECTED ||
    status === CLAIM_STATUSES.DIRECTOR_REJECTED;
  const reason =
    status === CLAIM_STATUSES.FINANCE_REJECTED
      ? financeRejectionReason
      : status === CLAIM_STATUSES.DIRECTOR_REJECTED
        ? directorRejectionReason
        : undefined;

  if (isRejected && reason) {
    return (
      <span className="group relative inline-block">
        <span className="cursor-help border-b border-dashed border-red-500 text-red-600 underline decoration-red-400 decoration-dotted underline-offset-2">
          {label}
        </span>
        <span className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 hidden w-64 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg group-hover:block">
          {reason}
        </span>
      </span>
    );
  }

  return <span>{label}</span>;
}
