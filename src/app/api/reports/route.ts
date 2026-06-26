import { connectDB } from "@/lib/db";
import { Claim } from "@/models/Claim";
import { Event } from "@/models/Event";
import { User } from "@/models/User";
import { ApprovalBatch } from "@/models/ApprovalBatch";
import { requireRoles } from "@/lib/auth";
import { rowsToCsv, rowsToExcelBuffer } from "@/lib/export";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    await requireRoles([
      ROLES.FINANCE,
      ROLES.DIRECTOR,
      ROLES.SYSTEM_ADMIN,
    ]);
    await connectDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "org";
    const eventId = searchParams.get("eventId");
    const employeeId = searchParams.get("employeeId");
    const format = searchParams.get("format");

    let rows: Record<string, unknown>[] = [];

    if (type === "event" && eventId) {
      const event = await Event.findById(eventId).lean();
      const claims = await Claim.find({ eventId })
        .populate("employeeId", "name")
        .populate("categoryId", "name")
        .lean();

      rows = claims.map((c) => ({
        "Claim ID": c.claimId,
        Employee: (c.employeeId as { name?: string })?.name,
        Amount: c.amount,
        Status: c.status,
        Category: (c.categoryId as { name?: string })?.name,
        "Claim Date": new Date(c.claimDate).toISOString().split("T")[0],
        Event: event?.name,
      }));
    } else if (type === "employee" && employeeId) {
      const user = await User.findById(employeeId).lean();
      const claims = await Claim.find({ employeeId })
        .populate("eventId", "name")
        .populate("categoryId", "name")
        .lean();

      rows = claims.map((c) => ({
        "Claim ID": c.claimId,
        Employee: user?.name,
        Amount: c.amount,
        Status: c.status,
        Event: (c.eventId as { name?: string })?.name,
        Category: (c.categoryId as { name?: string })?.name,
        "Claim Date": new Date(c.claimDate).toISOString().split("T")[0],
      }));
    } else {
      const [claims, events, users, batches] = await Promise.all([
        Claim.countDocuments(),
        Event.countDocuments(),
        User.countDocuments({ role: ROLES.EMPLOYEE }),
        ApprovalBatch.countDocuments(),
      ]);

      const statusAgg = await Claim.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$amount" } } },
      ]);

      const amountAgg = await Claim.aggregate([
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);

      if (format) {
        rows = statusAgg.map((s) => ({
          Status: s._id,
          Count: s.count,
          "Total Amount": s.total,
        }));
      } else {
        return jsonOk({
          summary: {
            totalClaims: claims,
            totalEvents: events,
            totalEmployees: users,
            totalBatches: batches,
            totalAmount: amountAgg[0]?.total || 0,
            byStatus: statusAgg,
          },
        });
      }
    }

    if (format === "csv") {
      const csv = await rowsToCsv(rows);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="report-${type}.csv"`,
        },
      });
    }

    if (format === "xlsx") {
      const buffer = await rowsToExcelBuffer(rows, "Report");
      return new NextResponse(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="report-${type}.xlsx"`,
        },
      });
    }

    return jsonOk({ rows });
  } catch (error) {
    return handleApiError(error);
  }
}
