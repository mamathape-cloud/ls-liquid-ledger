import type { ClaimStatus, BatchStatus } from "@/lib/constants";

export interface BankDetails {
  upiId?: string;
  accountNumber?: string;
  ifsc?: string;
  accountName?: string;
}

export interface SessionUser {
  id: string;
  phone: string;
  name: string;
  roleSlug: string;
  permissions: string[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ProofFile {
  originalName: string;
  storedPath: string;
  mimeType: string;
  size: number;
}

export interface ClaimListItem {
  _id: string;
  claimId: string;
  eventId: string;
  eventName?: string;
  employeeId: string;
  employeeName?: string;
  amount: number;
  claimDate: string;
  reason: string;
  categoryId: string;
  categoryName?: string;
  status: ClaimStatus;
  batchId?: string;
  createdAt: string;
}

export interface BatchListItem {
  _id: string;
  batchId: string;
  eventId: string;
  eventName?: string;
  claimIds: string[];
  totalAmount?: number;
  status: BatchStatus;
  submittedAt?: string;
  createdAt: string;
}

export interface ExpenseHead {
  name: string;
  amount?: number;
  subHeads: { name: string; amount: number }[];
}

export interface EventExpensePlanView {
  _id: string;
  eventId: string;
  eventName?: string;
  heads: ExpenseHead[];
}
