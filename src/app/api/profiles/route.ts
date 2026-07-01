import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { requireModule } from "@/lib/auth";
import { parseListQuery, buildTextSearch, paginateMeta } from "@/lib/pagination";
import { rowsToCsv, rowsToExcelBuffer } from "@/lib/export";
import { jsonOk, handleApiError } from "@/lib/api";
import { formatStatus } from "@/lib/utils";
import { NextResponse } from "next/server";

function formatProfileRow(u: {
  name: string;
  phone: string;
  roleSlug: string;
  status: string;
  bankDetails?: {
    upiId?: string | null;
    accountName?: string | null;
    accountNumber?: string | null;
    ifsc?: string | null;
  } | null;
}) {
  const bd = u.bankDetails || {};
  return {
    Name: u.name,
    Phone: u.phone,
    Role: formatStatus(u.roleSlug),
    Status: u.status,
    "UPI ID": bd.upiId || "",
    "Account Name": bd.accountName || "",
    "Account Number": bd.accountNumber || "",
    IFSC: bd.ifsc || "",
  };
}

export async function GET(request: Request) {
  try {
    await requireModule("all_profiles");
    await connectDB();

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");
    const { page, limit, search, sort, filters } = parseListQuery(searchParams);

    const query: Record<string, unknown> = {
      ...buildTextSearch(search, ["name", "phone"]),
    };

    if (filters.roleSlug) query.roleSlug = String(filters.roleSlug).toUpperCase();
    if (filters.status) query.status = filters.status;

    if (format === "csv" || format === "xlsx") {
      const users = await User.find(query).select("name phone roleSlug status bankDetails").sort(sort).lean();
      const rows = users.map((u) => formatProfileRow(u));

      if (format === "csv") {
        const csv = await rowsToCsv(rows);
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="profiles.csv"',
          },
        });
      }

      const buffer = await rowsToExcelBuffer(rows, "Profiles");
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": 'attachment; filename="profiles.xlsx"',
        },
      });
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(query)
        .select("name phone roleSlug status bankDetails createdAt updatedAt")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return jsonOk({
      data: users.map((u) => ({
        _id: u._id.toString(),
        name: u.name,
        phone: u.phone,
        roleSlug: u.roleSlug,
        status: u.status,
        bankDetails: u.bankDetails || {},
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      meta: paginateMeta(total, page, limit),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
