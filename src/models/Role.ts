import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const RoleSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, uppercase: true },
    modules: { type: [String], default: [] },
    isSystem: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

RoleSchema.index({ active: 1, name: 1 });

export type IRole = InferSchemaType<typeof RoleSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Role: Model<IRole> =
  mongoose.models.Role || mongoose.model<IRole>("Role", RoleSchema);
