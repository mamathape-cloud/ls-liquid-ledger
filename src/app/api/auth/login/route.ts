import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import {
  createToken,
  setAuthCookie,
  verifyPassword,
  getUserByPhone,
} from "@/lib/auth";
import { loginSchema } from "@/lib/validators";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { normalizePhone } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }

    const phone = normalizePhone(parsed.data.phone);
    const user = await getUserByPhone(phone);

    if (!user || user.status !== "ACTIVE") {
      return jsonError("Invalid phone number or password", 401);
    }

    const valid = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!valid) {
      return jsonError("Invalid phone number or password", 401);
    }

    const sessionUser = {
      id: user._id.toString(),
      phone: user.phone,
      name: user.name,
      role: user.role,
    };

    const token = await createToken(sessionUser);
    await setAuthCookie(token);

    return jsonOk({ user: sessionUser });
  } catch (error) {
    return handleApiError(error);
  }
}
