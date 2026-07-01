import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { requireModule, hashPassword } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { randomBytes } from "crypto";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireModule("users");
    const { id } = await params;

    await connectDB();
    const user = await User.findById(id);
    if (!user) return jsonError("User not found", 404);

    const newPassword = randomBytes(4).toString("hex");
    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    return jsonOk({
      user: {
        name: user.name,
        phone: user.phone,
        newPassword,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
