import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { BUDGET_TYPES, EVENT_STATUSES } from "@/lib/constants";

const AssignedEmployeeSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    preApprovedBudget: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const EventSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(EVENT_STATUSES),
      default: EVENT_STATUSES.ACTIVE,
    },
    budgetType: {
      type: String,
      enum: Object.values(BUDGET_TYPES),
      required: true,
    },
    eventBudget: { type: Number, min: 0 },
    allowFutureDatedClaims: { type: Boolean, default: false },
    assignedEmployees: { type: [AssignedEmployeeSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

EventSchema.index({ name: "text", description: "text" });
EventSchema.index({ status: 1, startDate: -1 });

export type IEvent = InferSchemaType<typeof EventSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Event: Model<IEvent> =
  mongoose.models.Event || mongoose.model<IEvent>("Event", EventSchema);
