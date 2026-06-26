import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES } from "../src/lib/constants";
import { normalizePhone } from "../src/lib/utils";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/liquid-ledger";

async function seed() {
  await mongoose.connect(MONGODB_URI);

  const User =
    mongoose.models.User ||
    mongoose.model(
      "User",
      new mongoose.Schema({
        phone: { type: String, required: true, unique: true },
        passwordHash: { type: String, required: true },
        name: { type: String, required: true },
        role: { type: String, required: true },
        status: { type: String, default: "ACTIVE" },
        bankDetails: { type: Object, default: {} },
      })
    );

  const phone = normalizePhone(process.env.SEED_ADMIN_PHONE || "9999999999");
  const password = process.env.SEED_ADMIN_PASSWORD || "admin123";
  const existing = await User.findOne({ phone });

  if (existing) {
    console.log(`System admin already exists for phone ${phone}`);
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    await User.create({
      phone,
      passwordHash,
      name: "System Admin",
      role: ROLES.SYSTEM_ADMIN,
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
