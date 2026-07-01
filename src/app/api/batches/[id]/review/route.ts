import { connectDB } from "@/lib/db";
import { ApprovalBatch } from "@/models/ApprovalBatch";
import { Claim } from "@/models/Claim";
import { requireModule, getUserIdsWithModule } from "@/lib/auth";
import { batchClaimReviewSchema } from "@/lib/validators";
import { sendNotifications } from "@/lib/notifications";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import {
  ROLES,
  CLAIM_STATUSES,
  BATCH_STATUSES,
} from "@/lib/constants";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireModule("director_batches");
    const { id } = await params;
    const body = await request.json();
    const parsed = batchClaimReviewSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }

    await connectDB();
    const batch = await ApprovalBatch.findById(id);
    if (!batch) return jsonError("Batch not found", 404);

    if (batch.status !== BATCH_STATUSES.SUBMITTED) {
      return jsonError("Batch is not pending director review", 400);
    }

    const claims = await Claim.find({ batchId: batch._id });
    const allClaimIds = claims.map((c) => c._id.toString());
    const approvedSet = new Set(parsed.data.approvedClaimIds);
    const rejectedIds = allClaimIds.filter((cid) => !approvedSet.has(cid));

    if (!approvedSet.size && !rejectedIds.length) {
      return jsonError("No claims found in this batch", 400);
    }

    if (rejectedIds.length > 0 && !parsed.data.rejectionReason?.trim()) {
      return jsonError(
        "Rejection reason is required for claims that are not approved",
        400
      );
    }

    if (approvedSet.size === 0) {
      batch.status = BATCH_STATUSES.DIRECTOR_REJECTED;
      batch.directorRejectionReason = parsed.data.rejectionReason;
      batch.directorReviewerId = session.id as unknown as typeof batch.directorReviewerId;
      batch.directorReviewedAt = new Date();
      await batch.save();

      await Claim.updateMany(
        { batchId: batch._id },
        {
          $set: {
            status: CLAIM_STATUSES.DIRECTOR_REJECTED,
            directorRejectionReason: parsed.data.rejectionReason,
          },
          $unset: { batchId: 1 },
        }
      );
    } else if (rejectedIds.length === 0) {
      batch.status = BATCH_STATUSES.DIRECTOR_APPROVED;
      batch.directorReviewerId = session.id as unknown as typeof batch.directorReviewerId;
      batch.directorReviewedAt = new Date();
      batch.totalAmount = claims
        .filter((c) => approvedSet.has(c._id.toString()))
        .reduce((sum, c) => sum + c.amount, 0);
      await batch.save();

      await Claim.updateMany(
        { _id: { $in: parsed.data.approvedClaimIds } },
        { status: CLAIM_STATUSES.DIRECTOR_APPROVED }
      );
    } else {
      // Partial approval
      batch.status = BATCH_STATUSES.DIRECTOR_APPROVED;
      batch.directorReviewerId = session.id as unknown as typeof batch.directorReviewerId;
      batch.directorReviewedAt = new Date();
      batch.claimIds = parsed.data.approvedClaimIds as unknown as typeof batch.claimIds;
      batch.totalAmount = claims
        .filter((c) => approvedSet.has(c._id.toString()))
        .reduce((sum, c) => sum + c.amount, 0);
      await batch.save();

      await Claim.updateMany(
        { _id: { $in: parsed.data.approvedClaimIds } },
        { status: CLAIM_STATUSES.DIRECTOR_APPROVED }
      );

      await Claim.updateMany(
        { _id: { $in: rejectedIds } },
        {
          $set: {
            status: CLAIM_STATUSES.DIRECTOR_REJECTED,
            directorRejectionReason: parsed.data.rejectionReason,
          },
          $unset: { batchId: 1 },
        }
      );
    }

    const financeUserIds = await getUserIdsWithModule("disburse");

    const notifType =
      batch.status === BATCH_STATUSES.DIRECTOR_APPROVED
        ? "BATCH_DIRECTOR_APPROVED"
        : "BATCH_DIRECTOR_REJECTED";

    const notifMessage =
      batch.status === BATCH_STATUSES.DIRECTOR_APPROVED
        ? `Batch ${batch.batchId} was reviewed. ${approvedSet.size} claim(s) approved${rejectedIds.length ? `, ${rejectedIds.length} rejected` : ""}.`
        : `Batch ${batch.batchId} was rejected: ${parsed.data.rejectionReason}`;

    await sendNotifications(
      financeUserIds.map((userId) => ({
        userId,
        type: notifType,
        title:
          batch.status === BATCH_STATUSES.DIRECTOR_APPROVED
            ? "Batch approved by Director"
            : "Batch rejected by Director",
        message: notifMessage,
        link: `/finance/batches?batchId=${batch.batchId}`,
      }))
    );

    // Notify employees of rejected claims
    if (rejectedIds.length) {
      const rejectedClaims = await Claim.find({ _id: { $in: rejectedIds } });
      await sendNotifications(
        rejectedClaims.map((c) => ({
          userId: c.employeeId.toString(),
          type: "CLAIM_DIRECTOR_REJECTED",
          title: "Claim rejected by Director",
          message: `Your claim ${c.claimId} was rejected: ${parsed.data.rejectionReason}`,
          link: `/employee/claims?claimId=${c.claimId}`,
        }))
      );
    }

    return jsonOk({ batch });
  } catch (error) {
    return handleApiError(error);
  }
}
