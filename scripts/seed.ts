import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES } from "../src/lib/constants";
import { DEFAULT_ROLES } from "../src/lib/role-defaults";
import { normalizePhone } from "../src/lib/utils";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/liquid-ledger";

async function seed() {
  await mongoose.connect(MONGODB_URI);

  const Role =
    mongoose.models.Role ||
    mongoose.model(
      "Role",
      new mongoose.Schema({
        name: { type: String, required: true },
        slug: { type: String, required: true, unique: true },
        modules: { type: [String], default: [] },
        isSystem: { type: Boolean, default: false },
        active: { type: Boolean, default: true },
      })
    );

  for (const role of DEFAULT_ROLES) {
    await Role.findOneAndUpdate(
      { slug: role.slug },
      {
        $set: {
          name: role.name,
          modules: role.modules,
          isSystem: role.isSystem,
          active: true,
        },
      },
      { upsert: true, new: true }
    );
    console.log(`Upserted role: ${role.slug}`);
  }

  const User =
    mongoose.models.User ||
    mongoose.model(
      "User",
      new mongoose.Schema(
        {
          phone: { type: String, required: true, unique: true },
          passwordHash: { type: String, required: true },
          name: { type: String, required: true },
          roleSlug: { type: String },
          role: { type: String },
          status: { type: String, default: "ACTIVE" },
          bankDetails: { type: Object, default: {} },
        },
        { strict: false }
      )
    );

  const legacyUsers = await User.find({
    $or: [{ roleSlug: { $exists: false } }, { roleSlug: null }, { roleSlug: "" }],
  });

  for (const user of legacyUsers) {
    const legacyRole = (user as { role?: string }).role;
    if (legacyRole) {
      user.roleSlug = legacyRole.toUpperCase();
      await user.save();
      console.log(`Migrated user ${user.phone} role -> roleSlug ${user.roleSlug}`);
    }
  }

  const phone = normalizePhone(process.env.SEED_ADMIN_PHONE || "9999999999");
  const password = process.env.SEED_ADMIN_PASSWORD || "admin123";
  const existing = await User.findOne({ phone });

  if (existing) {
    if (!existing.roleSlug) {
      existing.roleSlug = ROLES.SYSTEM_ADMIN;
      await existing.save();
    }
    console.log(`System admin already exists for phone ${phone}`);
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    await User.create({
      phone,
      passwordHash,
      name: "System Admin",
      roleSlug: ROLES.SYSTEM_ADMIN,
      status: "ACTIVE",
    });
    console.log(`Created system admin: phone=${phone}, password=${password}`);
  }

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
