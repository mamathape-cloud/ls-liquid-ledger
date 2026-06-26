import { connectDB } from "@/lib/db";
import { ApprovalBatch } from "@/models/ApprovalBatch";
import { Claim } from "@/models/Claim";
import { requireRoles } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRoles([ROLES.FINANCE, ROLES.DIRECTOR, ROLES.SYSTEM_ADMIN]);
    const { id } = await params;
    await connectDB();

    const batch = await ApprovalBatch.findById(id)
      .populate("eventId", "name")
      .populate("submittedBy", "name")
      .lean();

    if (!batch) return jsonError("Batch not found", 404);

    const claims = await Claim.find({ batchId: id })
      .populate("employeeId", "name phone bankDetails")
      .populate("categoryId", "name")
      .lean();

    return jsonOk({ batch, claims });
  } catch (error) {
    return handleApiError(error);
  }
}
