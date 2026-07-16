import { connectDB } from "@/lib/db";
import { ApprovalBatch } from "@/models/ApprovalBatch";
import { Claim } from "@/models/Claim";
import { requireModule } from "@/lib/auth";
import { rowsToExcelBuffer } from "@/lib/export";
import { findClaimsForBatch } from "@/lib/batch-claims";
import { canExportBatchPayout } from "@/lib/batch-status";
import { jsonError, handleApiError } from "@/lib/api";
import { CLAIM_STATUSES } from "@/lib/constants";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireModule("batches");
    const { id } = await params;
    await connectDB();

    const batch = await ApprovalBatch.findById(id).populate("eventId", "name");
    if (!batch) return jsonError("Batch not found", 404);

    if (!canExportBatchPayout(batch.status)) {
      return jsonError("Batch must be reviewed before export", 400);
    }

    const allClaims = await findClaimsForBatch(id, batch.claimIds || []);
    const claims = allClaims.filter((c) => c.status === CLAIM_STATUSES.DIRECTOR_APPROVED);

    const rows = claims.map((c) => {
      const employee = c.employeeId as {
        name?: string;
        phone?: string;
        bankDetails?: {
          upiId?: string;
          accountNumber?: string;
          ifsc?: string;
          accountName?: string;
        };
      };
      return {
        "Claim ID": c.claimId,
        "Employee Name": employee?.name || "",
        "Employee Phone": employee?.phone || "",
        Amount: c.amount,
        "Event": (c.eventId as { name?: string })?.name || "",
        "UPI ID": employee?.bankDetails?.upiId || "",
        "Account Name": employee?.bankDetails?.accountName || "",
        "Account Number": employee?.bankDetails?.accountNumber || "",
        IFSC: employee?.bankDetails?.ifsc || "",
        "Claim Date": new Date(c.claimDate).toISOString().split("T")[0],
        Reason: c.reason,
      };
    });

    const buffer = await rowsToExcelBuffer(rows, "Payout");
    const filename = `payout-${batch.batchId}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
