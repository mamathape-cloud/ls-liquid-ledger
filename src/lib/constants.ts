export const ROLES = {
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
  FINANCE: "FINANCE",
  DIRECTOR: "DIRECTOR",
  EMPLOYEE: "EMPLOYEE",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const CLAIM_STATUSES = {
  SUBMITTED: "SUBMITTED",
  FINANCE_APPROVED: "FINANCE_APPROVED",
  FINANCE_REJECTED: "FINANCE_REJECTED",
  IN_DIRECTOR_REVIEW: "IN_DIRECTOR_REVIEW",
  DIRECTOR_APPROVED: "DIRECTOR_APPROVED",
  DIRECTOR_REJECTED: "DIRECTOR_REJECTED",
  DISBURSED: "DISBURSED",
} as const;

export type ClaimStatus = (typeof CLAIM_STATUSES)[keyof typeof CLAIM_STATUSES];

export const BATCH_STATUSES = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  REVIEWED: "REVIEWED",
  /** @deprecated Kept for existing DB records; treat as REVIEWED in UI. */
  DIRECTOR_APPROVED: "DIRECTOR_APPROVED",
  /** @deprecated Kept for existing DB records; treat as REVIEWED in UI. */
  DIRECTOR_REJECTED: "DIRECTOR_REJECTED",
} as const;

/** Statuses shown in Director / Finance batch filters (excludes draft & legacy). */
export const BATCH_STATUS_UI_OPTIONS = [
  BATCH_STATUSES.SUBMITTED,
  BATCH_STATUSES.REVIEWED,
] as const;

export type BatchStatus = (typeof BATCH_STATUSES)[keyof typeof BATCH_STATUSES];

export const EVENT_STATUSES = {
  ACTIVE: "ACTIVE",
  CLOSED: "CLOSED",
} as const;

export const BUDGET_TYPES = {
  PER_EVENT: "per_event",
  PER_EMPLOYEE: "per_employee",
} as const;

export const DEFAULT_PAGE_SIZE = 10;

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
