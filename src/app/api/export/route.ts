import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Category } from "@/models/Category";
import { Event } from "@/models/Event";
import { Claim } from "@/models/Claim";
import { ApprovalBatch } from "@/models/ApprovalBatch";
import { Notification } from "@/models/Notification";
import { requireAuth } from "@/lib/auth";
import { rowsToCsv, rowsToExcelBuffer } from "@/lib/export";
import { formatStatus } from "@/lib/utils";
import { jsonError, handleApiError } from "@/lib/api";
import { NextResponse } from "next/server";

const tableModels: Record<string, { model: unknown; fields: string[] }> = {
  users: { model: User, fields: ["name", "phone", "roleSlug", "status"] },
  categories: { model: Category, fields: ["name", "active"] },
  events: { model: Event, fields: ["name", "description", "status"] },
  claims: { model: Claim, fields: ["claimId", "reason", "status"] },
  batches: { model: ApprovalBatch, fields: ["batchId", "status"] },
  notifications: { model: Notification, fields: ["title", "message"] },
};

export async function GET(request: Request) {
  try {
    await requireAuth();
    await connectDB();

    const { searchParams } = new URL(request.url);
    const table = searchParams.get("table");
    const format = searchParams.get("format") || "csv";

    if (!table || !tableModels[table]) {
      return jsonError("Invalid table for export", 400);
    }

    const { model } = tableModels[table];
    const docs = await (model as { find: (q: object) => { limit: (n: number) => { lean: () => Promise<Record<string, unknown>[]> } } }).find({}).limit(5000).lean();

    const rows =
      table === "users"
        ? docs.map((doc) => ({
            Name: doc.name ?? "",
            Phone: doc.phone ?? "",
            Role: formatStatus(String(doc.roleSlug || doc.role || "")),
            Status: doc.status ?? "",
          }))
        : docs.map((doc) => {
            const row: Record<string, unknown> = {};
            Object.entries(doc).forEach(([key, value]) => {
              if (key === "_id") row.id = String(value);
              else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
                row[key] = JSON.stringify(value);
              } else row[key] = value;
            });
            return row;
          });

    if (format === "xlsx") {
      const buffer = await rowsToExcelBuffer(rows, table);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${table}.xlsx"`,
        },
      });
    }

    const csv = await rowsToCsv(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${table}.csv"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
