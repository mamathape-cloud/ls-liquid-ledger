import mongoose from "mongoose";
import { Claim } from "@/models/Claim";

export async function findClaimsForBatch(
  batchMongoId: string,
  claimIds: (mongoose.Types.ObjectId | string)[]
) {
  const ids = claimIds.map((id) => new mongoose.Types.ObjectId(String(id)));
  const claims = await Claim.find({
    $or: [{ batchId: batchMongoId }, { _id: { $in: ids } }],
  })
    .populate("employeeId", "name phone bankDetails")
    .populate("categoryId", "name")
    .populate("eventId", "name")
    .lean();

  const seen = new Set<string>();
  return claims.filter((c) => {
    const key = String(c._id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
