import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { rowsToCsv, rowsToExcelBuffer } from "@/lib/export";
import {
  buildBatchesExportRows,
  buildCategoriesExportRows,
  buildClaimsExportRows,
  buildEventsExportRows,
  buildUsersExportRows,
} from "@/lib/export-data";
import { jsonError, handleApiError } from "@/lib/api";
import { NextResponse } from "next/server";

const EXPORT_BUILDERS: Record<string, () => Promise<Record<string, unknown>[]>> = {
  users: buildUsersExportRows,
  categories: buildCategoriesExportRows,
  events: buildEventsExportRows,
  claims: buildClaimsExportRows,
  batches: buildBatchesExportRows,
};

export async function GET(request: Request) {
  try {
    await requireAuth();
    await connectDB();

    const { searchParams } = new URL(request.url);
    const table = searchParams.get("table");
    const format = searchParams.get("format") || "csv";

    if (!table || !EXPORT_BUILDERS[table]) {
      return jsonError("Invalid table for export", 400);
    }

    const rows = await EXPORT_BUILDERS[table]();

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
