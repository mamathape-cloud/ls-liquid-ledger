import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "").slice(-10);
}

export function sanitizeClaimAmountInput(value: string) {
  let cleaned = value.replace(/[^\d.]/g, "");
  const dotIndex = cleaned.indexOf(".");
  if (dotIndex !== -1) {
    const whole = cleaned.slice(0, dotIndex);
    const fraction = cleaned.slice(dotIndex + 1).replace(/\./g, "").slice(0, 2);
    cleaned = `${whole}.${fraction}`;
  }
  return cleaned;
}

export function validateClaimAmount(amount: string) {
  const trimmed = amount.trim();
  if (!trimmed) return "Amount is required";
  if (trimmed.startsWith("-") || trimmed.includes("-")) {
    return "Amount cannot be negative";
  }
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    if (/^\d+\.\d{3,}$/.test(trimmed)) {
      return "Amount can have at most 2 decimal places";
    }
    return "Enter a valid amount";
  }
  const value = Number(trimmed);
  if (value <= 0) return "Amount must be greater than 0";
  return null;
}

export async function generateClaimId() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 900000) + 100000;
  return `LL-${year}-${random}`;
}

export async function generateBatchId() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 90000) + 10000;
  return `BATCH-${year}-${random}`;
}
