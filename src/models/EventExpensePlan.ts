import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const SubHeadSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const ExpenseHeadSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    amount: { type: Number, min: 0 },
    subHeads: { type: [SubHeadSchema], default: [] },
  },
  { _id: false }
);

const EventExpensePlanSchema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      unique: true,
    },
    heads: { type: [ExpenseHeadSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export type IEventExpensePlan = InferSchemaType<typeof EventExpensePlanSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const EventExpensePlan: Model<IEventExpensePlan> =
  mongoose.models.EventExpensePlan ||
  mongoose.model<IEventExpensePlan>("EventExpensePlan", EventExpensePlanSchema);
