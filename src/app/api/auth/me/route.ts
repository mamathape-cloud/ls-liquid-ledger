import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { getSessionFromRequest, getRolePermissions } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const session = await getSessionFromRequest();
    if (!session) {
      return jsonError("Unauthorized", 401);
    }

    await connectDB();
    const user = await User.findById(session.id).select(
      "phone name roleSlug status bankDetails"
    );

    if (!user) {
      return jsonError("User not found", 404);
    }

    const permissions = await getRolePermissions(user.roleSlug);

    return jsonOk({
      user: {
        id: user._id.toString(),
        phone: user.phone,
        name: user.name,
        roleSlug: user.roleSlug,
        permissions,
        status: user.status,
        bankDetails: user.bankDetails,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
