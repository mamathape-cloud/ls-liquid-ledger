import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { CLAIM_STATUSES } from "@/lib/constants";

const ProofFileSchema = new Schema(
  {
    originalName: { type: String, required: true },
    storedPath: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false }
);

const ClaimSchema = new Schema(
  {
    claimId: { type: String, required: true, unique: true, trim: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 0.01 },
    claimDate: { type: Date, required: true },
    reason: { type: String, required: true, trim: true },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    proofFiles: { type: [ProofFileSchema], default: [] },
    status: {
      type: String,
      enum: Object.values(CLAIM_STATUSES),
      default: CLAIM_STATUSES.SUBMITTED,
    },
    financeReviewerId: { type: Schema.Types.ObjectId, ref: "User" },
    financeReviewedAt: { type: Date },
    financeRejectionReason: { type: String, trim: true },
    directorRejectionReason: { type: String, trim: true },
    batchId: { type: Schema.Types.ObjectId, ref: "ApprovalBatch" },
    disbursedBy: { type: Schema.Types.ObjectId, ref: "User" },
    disbursedAt: { type: Date },
    paymentRef: { type: String, trim: true },
  },
  { timestamps: true }
);

ClaimSchema.index({ claimId: 1 });
ClaimSchema.index({ eventId: 1, status: 1 });
ClaimSchema.index({ employeeId: 1, status: 1 });
ClaimSchema.index({ status: 1, createdAt: -1 });
ClaimSchema.index({ reason: "text", claimId: "text" });

export type IClaim = InferSchemaType<typeof ClaimSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Claim: Model<IClaim> =
  mongoose.models.Claim || mongoose.model<IClaim>("Claim", ClaimSchema);
