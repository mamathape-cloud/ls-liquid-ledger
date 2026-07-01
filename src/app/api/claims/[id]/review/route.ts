import { connectDB } from "@/lib/db";
import { Claim } from "@/models/Claim";
import { User } from "@/models/User";
import { requireModule } from "@/lib/auth";
import { claimReviewSchema } from "@/lib/validators";
import { sendNotification } from "@/lib/notifications";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { ROLES, CLAIM_STATUSES } from "@/lib/constants";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireModule("review_claims");
    const { id } = await params;
    const body = await request.json();
    const parsed = claimReviewSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }

    await connectDB();
    const claim = await Claim.findById(id);
    if (!claim) return jsonError("Claim not found", 404);

    if (claim.status !== CLAIM_STATUSES.SUBMITTED) {
      return jsonError("Claim is not pending finance review", 400);
    }

    claim.financeReviewerId = session.id as unknown as typeof claim.financeReviewerId;
    claim.financeReviewedAt = new Date();

    if (parsed.data.action === "approve") {
      claim.status = CLAIM_STATUSES.FINANCE_APPROVED;
      claim.financeRejectionReason = undefined;
      await claim.save();

      await sendNotification({
        userId: claim.employeeId.toString(),
        type: "CLAIM_FINANCE_APPROVED",
        title: "Claim approved by Finance",
        message: `Your claim ${claim.claimId} was approved by Finance.`,
        link: `/employee/claims?claimId=${claim.claimId}`,
      });

      return jsonOk({ claim });
    }

    claim.status = CLAIM_STATUSES.FINANCE_REJECTED;
    claim.financeRejectionReason = parsed.data.rejectionReason;
    await claim.save();

    await sendNotification({
      userId: claim.employeeId.toString(),
      type: "CLAIM_FINANCE_REJECTED",
      title: "Claim rejected by Finance",
      message: `Your claim ${claim.claimId} was rejected: ${parsed.data.rejectionReason}`,
      link: `/employee/claims?claimId=${claim.claimId}`,
    });

    return jsonOk({ claim });
  } catch (error) {
    return handleApiError(error);
  }
}
