import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { requireRoles, hashPassword } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { ROLES } from "@/lib/constants";

const RESET_PASSWORD = "Pass@1234";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRoles([ROLES.SYSTEM_ADMIN]);
    const { id } = await params;
    await connectDB();

    const user = await User.findById(id);
    if (!user) return jsonError("User not found", 404);

    user.passwordHash = await hashPassword(RESET_PASSWORD);
    await user.save();

    return jsonOk({
      message: "Password reset successfully",
      phone: user.phone,
      name: user.name,
      newPassword: RESET_PASSWORD,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
