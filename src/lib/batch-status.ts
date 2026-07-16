import { BATCH_STATUSES } from "@/lib/constants";

export function isBatchReviewed(status: string) {
  return (
    status === BATCH_STATUSES.REVIEWED ||
    status === BATCH_STATUSES.DIRECTOR_APPROVED ||
    status === BATCH_STATUSES.DIRECTOR_REJECTED
  );
}

export function canExportBatchPayout(status: string) {
  return isBatchReviewed(status);
}

/** Normalize batch status for UI: only Submitted vs Reviewed after director action. */
export function normalizeBatchStatus(status: string) {
  if (isBatchReviewed(status)) return BATCH_STATUSES.REVIEWED;
  return status;
}

export function formatBatchStatus(status: string) {
  return normalizeBatchStatus(status).replace(/_/g, " ");
}

/** Expand REVIEWED filter so legacy approved/rejected batches are included. */
export function expandBatchStatusFilter(status: string | undefined) {
  if (!status) return undefined;
  if (status === BATCH_STATUSES.REVIEWED) {
    return {
      $in: [
        BATCH_STATUSES.REVIEWED,
        BATCH_STATUSES.DIRECTOR_APPROVED,
        BATCH_STATUSES.DIRECTOR_REJECTED,
      ],
    };
  }
  return status;
}
