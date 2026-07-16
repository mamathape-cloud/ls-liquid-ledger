import { Event } from "@/models/Event";
import { Claim } from "@/models/Claim";
import { ApprovalBatch } from "@/models/ApprovalBatch";
import { Category } from "@/models/Category";
import { User } from "@/models/User";
import { findClaimsForBatch } from "@/lib/batch-claims";
import { formatStatus } from "@/lib/utils";
import { formatBatchStatus } from "@/lib/batch-status";

function isoDate(value: unknown) {
  if (!value) return "";
  return new Date(String(value)).toISOString().split("T")[0];
}

export async function buildEventsExportRows() {
  const events = await Event.find({})
    .populate("assignedEmployees.employeeId", "name")
    .populate("createdBy", "name")
    .limit(5000)
    .lean();

  return events.map((event) => {
    const assigned = (event.assignedEmployees || [])
      .map((entry) => {
        const employee = entry.employeeId as { name?: string } | null;
        const name = employee?.name || "Unknown";
        return `${name} (${entry.preApprovedBudget})`;
      })
      .join("; ");

    return {
      "Event Name": event.name,
      Description: event.description || "",
      "Start Date": isoDate(event.startDate),
      "End Date": isoDate(event.endDate),
      Status: formatStatus(String(event.status)),
      "Budget Type": formatStatus(String(event.budgetType)),
      "Event Budget": event.eventBudget ?? "",
      "Allow Future Dated Claims": event.allowFutureDatedClaims ? "Yes" : "No",
      "Assigned Employees": assigned,
      "Created By": (event.createdBy as { name?: string })?.name || "",
      "Created At": isoDate(event.createdAt),
    };
  });
}

export async function buildClaimsExportRows() {
  const claims = await Claim.find({})
    .populate("employeeId", "name phone")
    .populate("eventId", "name")
    .populate("categoryId", "name")
    .populate("batchId", "batchId")
    .limit(5000)
    .lean();

  return claims.map((claim) => ({
    "Claim ID": claim.claimId,
    Employee: (claim.employeeId as { name?: string })?.name || "",
    "Employee Phone": (claim.employeeId as { phone?: string })?.phone || "",
    Event: (claim.eventId as { name?: string })?.name || "",
    Category: (claim.categoryId as { name?: string })?.name || "",
    Amount: claim.amount,
    "Claim Date": isoDate(claim.claimDate),
    Reason: claim.reason,
    Status: formatStatus(String(claim.status)),
    "Finance Rejection Reason": claim.financeRejectionReason || "",
    "Director Rejection Reason": claim.directorRejectionReason || "",
    Batch: (claim.batchId as { batchId?: string })?.batchId || "",
    "Payment Reference": claim.paymentRef || "",
    "Disbursed At": isoDate(claim.disbursedAt),
  }));
}

export async function buildBatchesExportRows() {
  const batches = await ApprovalBatch.find({})
    .populate("eventId", "name")
    .populate("submittedBy", "name")
    .limit(5000)
    .lean();

  const rows: Record<string, unknown>[] = [];

  for (const batch of batches) {
    const eventName = (batch.eventId as { name?: string })?.name || "";
    const submittedBy = (batch.submittedBy as { name?: string })?.name || "";
    const claims = await findClaimsForBatch(String(batch._id), batch.claimIds || []);

    if (!claims.length) {
      rows.push({
        "Batch ID": batch.batchId,
        Event: eventName,
        "Batch Status": formatBatchStatus(String(batch.status)),
        "Submitted By": submittedBy,
        "Submitted At": isoDate(batch.submittedAt),
        "Total Amount": batch.totalAmount,
        "Claim ID": "",
        Employee: "",
        Amount: "",
        "Claim Date": "",
        Category: "",
        Reason: "",
        "Claim Status": "",
        "Director Rejection Reason": batch.directorRejectionReason || "",
      });
      continue;
    }

    for (const claim of claims) {
      rows.push({
        "Batch ID": batch.batchId,
        Event: eventName,
        "Batch Status": formatBatchStatus(String(batch.status)),
        "Submitted By": submittedBy,
        "Submitted At": isoDate(batch.submittedAt),
        "Total Amount": batch.totalAmount,
        "Claim ID": claim.claimId,
        Employee: (claim.employeeId as { name?: string })?.name || "",
        Amount: claim.amount,
        "Claim Date": isoDate(claim.claimDate),
        Category: (claim.categoryId as { name?: string })?.name || "",
        Reason: claim.reason,
        "Claim Status": formatStatus(String(claim.status)),
        "Director Rejection Reason": claim.directorRejectionReason || batch.directorRejectionReason || "",
      });
    }
  }

  return rows;
}

export async function buildCategoriesExportRows() {
  const categories = await Category.find({}).populate("createdBy", "name").limit(5000).lean();
  return categories.map((category) => ({
    Name: category.name,
    Status: category.active ? "Active" : "Inactive",
    "Created By": (category.createdBy as { name?: string })?.name || "",
    "Created At": isoDate(category.createdAt),
  }));
}

export async function buildUsersExportRows() {
  const users = await User.find({}).limit(5000).lean();
  return users.map((doc) => ({
    Name: doc.name ?? "",
    Phone: doc.phone ?? "",
    Role: formatStatus(String(doc.roleSlug || "")),
    Status: doc.status ?? "",
  }));
}
