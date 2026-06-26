import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { getSessionFromRequest } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const session = await getSessionFromRequest();
    if (!session) {
      return jsonError("Unauthorized", 401);
    }

    await connectDB();
    const user = await User.findById(session.id).select(
      "phone name role status bankDetails"
    );

    if (!user) {
      return jsonError("User not found", 404);
    }

    return jsonOk({
      user: {
        id: user._id.toString(),
        phone: user.phone,
        name: user.name,
        role: user.role,
        status: user.status,
        bankDetails: user.bankDetails,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
