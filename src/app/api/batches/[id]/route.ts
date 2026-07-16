import { connectDB } from "@/lib/db";
import { ApprovalBatch } from "@/models/ApprovalBatch";
import { Claim } from "@/models/Claim";
import { requireAnyModule } from "@/lib/auth";
import { findClaimsForBatch } from "@/lib/batch-claims";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAnyModule(["batches", "director_batches"]);
    const { id } = await params;
    await connectDB();

    const batch = await ApprovalBatch.findById(id)
      .populate("eventId", "name")
      .populate("submittedBy", "name")
      .lean();

    if (!batch) return jsonError("Batch not found", 404);

    const claims = await findClaimsForBatch(id, batch.claimIds || []);

    return jsonOk({ batch, claims });
  } catch (error) {
    return handleApiError(error);
  }
}
