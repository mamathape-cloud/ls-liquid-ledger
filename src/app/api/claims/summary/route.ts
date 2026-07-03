import { connectDB } from "@/lib/db";
import { Claim } from "@/models/Claim";
import { requireModule } from "@/lib/auth";
import { monthRange } from "@/lib/claim-budget";
import { CLAIM_STATUSES } from "@/lib/constants";
import { jsonOk, handleApiError } from "@/lib/api";
import mongoose from "mongoose";

export async function GET() {
  try {
    const session = await requireModule("my_claims");
    await connectDB();

    const { start, end } = monthRange();
    const employeeId = new mongoose.Types.ObjectId(session.id);

    const [totalClaims, claimedAgg, settledAgg] = await Promise.all([
      Claim.countDocuments({ employeeId }),
      Claim.aggregate([
        {
          $match: {
            employeeId,
            claimDate: { $gte: start, $lte: end },
            status: {
              $nin: [
                CLAIM_STATUSES.FINANCE_REJECTED,
                CLAIM_STATUSES.DIRECTOR_REJECTED,
              ],
            },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Claim.aggregate([
        {
          $match: {
            employeeId,
            status: CLAIM_STATUSES.DISBURSED,
            disbursedAt: { $gte: start, $lte: end },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    return jsonOk({
      totalClaims,
      claimedAmountThisMonth: claimedAgg[0]?.total ?? 0,
      settledAmountThisMonth: settledAgg[0]?.total ?? 0,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
