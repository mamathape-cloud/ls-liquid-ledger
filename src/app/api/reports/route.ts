import { connectDB } from "@/lib/db";
import { Claim } from "@/models/Claim";
import { Category } from "@/models/Category";
import { Event } from "@/models/Event";
import { User } from "@/models/User";
import { ApprovalBatch } from "@/models/ApprovalBatch";
import { EventExpensePlan } from "@/models/EventExpensePlan";
import { requireModule, hasModule } from "@/lib/auth";
import { rowsToCsv, rowsToExcelBuffer } from "@/lib/export";
import { flattenExpensePlanRows } from "@/lib/event-expenses";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { formatStatus } from "@/lib/utils";
import { ROLES } from "@/lib/constants";
import { NextResponse } from "next/server";

function formatClaimRow(c: {
  claimId: string;
  amount: number;
  status: string;
  claimDate: Date;
  reason?: string;
  employeeId?: { name?: string } | unknown;
  eventId?: { name?: string } | unknown;
  categoryId?: { name?: string } | unknown;
}) {
  return {
    Type: "Claim",
    "Claim ID": c.claimId,
    Employee: (c.employeeId as { name?: string })?.name || "",
    Event: (c.eventId as { name?: string })?.name || "",
    Category: (c.categoryId as { name?: string })?.name || "",
    Head: "",
    "Sub-Head": "",
    Amount: c.amount,
    Status: formatStatus(c.status),
    "Claim Date": new Date(c.claimDate).toISOString().split("T")[0],
    Reason: c.reason || "",
  };
}

async function fetchClaimRows(filter: Record<string, unknown> = {}) {
  const claims = await Claim.find(filter)
    .populate("employeeId", "name")
    .populate("eventId", "name")
    .populate("categoryId", "name")
    .sort({ createdAt: -1 })
    .lean();

  return claims.map((c) => formatClaimRow(c));
}

async function fetchEventExpenseRows(eventId: string) {
  const event = await Event.findById(eventId).select("name").lean();
  if (!event) return [];

  const plan = await EventExpensePlan.findOne({ eventId }).lean();
  if (!plan?.heads?.length) return [];

  return flattenExpensePlanRows(event.name, plan.heads as Parameters<typeof flattenExpensePlanRows>[1]);
}

export async function GET(request: Request) {
  try {
    const session = await requireModule("reports");
    await connectDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "org";
    const eventId = searchParams.get("eventId");
    const employeeId = searchParams.get("employeeId");
    const format = searchParams.get("format");
    const detail = searchParams.get("detail") === "true";
    const expenseView = searchParams.get("expenseView") || "claims";
    const canViewEventExpenses = hasModule(session, "event_expenses");

    let rows: Record<string, unknown>[] = [];

    if (type === "event") {
      if (!eventId) {
        if (format) return jsonError("Event is required for export", 400);
        return jsonOk({ rows: [], canViewEventExpenses });
      }

      const claimRows = await fetchClaimRows({ eventId });
      const effectiveView =
        !canViewEventExpenses || expenseView === "claims"
          ? "claims"
          : expenseView;

      if (effectiveView === "claims") {
        rows = claimRows;
      } else if (effectiveView === "other_expenses") {
        rows = await fetchEventExpenseRows(eventId);
      } else {
        const expenseRows = await fetchEventExpenseRows(eventId);
        rows = [...claimRows, ...expenseRows];
      }
    } else if (type === "employee") {
      if (!employeeId) {
        if (format) return jsonError("Employee is required for export", 400);
        return jsonOk({ rows: [] });
      }
      rows = await fetchClaimRows({ employeeId });
    } else if (detail || format) {
      rows = await fetchClaimRows();
    } else {
      const [claims, events, users, batches] = await Promise.all([
        Claim.countDocuments(),
        Event.countDocuments(),
        User.countDocuments({ roleSlug: ROLES.EMPLOYEE }),
        ApprovalBatch.countDocuments(),
      ]);

      const statusAgg = await Claim.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$amount" } } },
      ]);

      const amountAgg = await Claim.aggregate([
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);

      return jsonOk({
        summary: {
          totalClaims: claims,
          totalEvents: events,
          totalEmployees: users,
          totalBatches: batches,
          totalAmount: amountAgg[0]?.total || 0,
          byStatus: statusAgg,
        },
        canViewEventExpenses,
      });
    }

    if (format === "csv") {
      const csv = await rowsToCsv(rows);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="report-${type}.csv"`,
        },
      });
    }

    if (format === "xlsx") {
      const buffer = await rowsToExcelBuffer(rows, "Report");
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="report-${type}.xlsx"`,
        },
      });
    }

    return jsonOk({ rows, total: rows.length, canViewEventExpenses });
  } catch (error) {
    return handleApiError(error);
  }
}
