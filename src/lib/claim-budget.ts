import { CLAIM_STATUSES } from "@/lib/constants";

export const REJECTED_CLAIM_STATUSES = [
  CLAIM_STATUSES.FINANCE_REJECTED,
  CLAIM_STATUSES.DIRECTOR_REJECTED,
] as const;

export function countsTowardEventBudget(status: string) {
  return !REJECTED_CLAIM_STATUSES.includes(
    status as (typeof REJECTED_CLAIM_STATUSES)[number]
  );
}

export function sumActiveClaimAmounts(
  claims: { amount: number; status: string }[]
) {
  return claims
    .filter((c) => countsTowardEventBudget(c.status))
    .reduce((sum, c) => sum + c.amount, 0);
}

export function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}
