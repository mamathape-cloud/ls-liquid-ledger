import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { BATCH_STATUSES } from "@/lib/constants";

const ApprovalBatchSchema = new Schema(
  {
    batchId: { type: String, required: true, unique: true, trim: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    claimIds: [{ type: Schema.Types.ObjectId, ref: "Claim" }],
    status: {
      type: String,
      enum: Object.values(BATCH_STATUSES),
      default: BATCH_STATUSES.DRAFT,
    },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User" },
    submittedAt: { type: Date },
    directorReviewerId: { type: Schema.Types.ObjectId, ref: "User" },
    directorReviewedAt: { type: Date },
    directorRejectionReason: { type: String, trim: true },
    totalAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ApprovalBatchSchema.index({ batchId: 1 });
ApprovalBatchSchema.index({ eventId: 1, status: 1 });
ApprovalBatchSchema.index({ status: 1, createdAt: -1 });

export type IApprovalBatch = InferSchemaType<typeof ApprovalBatchSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ApprovalBatch: Model<IApprovalBatch> =
  mongoose.models.ApprovalBatch ||
  mongoose.model<IApprovalBatch>("ApprovalBatch", ApprovalBatchSchema);
