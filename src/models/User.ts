import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const BankDetailsSchema = new Schema(
  {
    upiId: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifsc: { type: String, trim: true, uppercase: true },
    accountName: { type: String, trim: true },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    phone: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    roleSlug: { type: String, required: true, trim: true, uppercase: true },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
    bankDetails: { type: BankDetailsSchema, default: () => ({}) },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

UserSchema.index({ roleSlug: 1, status: 1 });
UserSchema.index({ name: "text", phone: "text" });

export type IUser = InferSchemaType<typeof UserSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
