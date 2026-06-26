import { connectDB } from "@/lib/db";
import { Claim } from "@/models/Claim";
import { User } from "@/models/User";
import { requireRoles } from "@/lib/auth";
import { disburseSchema } from "@/lib/validators";
import { sendNotifications } from "@/lib/notifications";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { ROLES, CLAIM_STATUSES } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const session = await requireRoles([ROLES.FINANCE]);
    const body = await request.json();
    const parsed = disburseSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }

    await connectDB();

    const claims = await Claim.find({
      _id: { $in: parsed.data.claimIds },
      status: CLAIM_STATUSES.DIRECTOR_APPROVED,
    });

    if (claims.length !== parsed.data.claimIds.length) {
      return jsonError("Some claims are not eligible for disbursement", 400);
    }

    const now = new Date();
    await Claim.updateMany(
      { _id: { $in: parsed.data.claimIds } },
      {
        status: CLAIM_STATUSES.DISBURSED,
        disbursedBy: session.id,
        disbursedAt: now,
        paymentRef: parsed.data.paymentRef,
      }
    );

    await sendNotifications(
      claims.map((c) => ({
        userId: c.employeeId.toString(),
        type: "CLAIM_DISBURSED",
        title: "Claim disbursed",
        message: `Your claim ${c.claimId} has been marked as disbursed. Ref: ${parsed.data.paymentRef}`,
        link: `/employee/claims?claimId=${c.claimId}`,
      }))
    );

    return jsonOk({ updated: claims.length });
  } catch (error) {
    return handleApiError(error);
  }
}
