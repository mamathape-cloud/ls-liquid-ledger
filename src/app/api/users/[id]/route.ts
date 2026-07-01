import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Role } from "@/models/Role";
import {
  requireAuth,
  requireModule,
  hashPassword,
  canManageRole,
  hasModule,
} from "@/lib/auth";
import { userUpdateSchema, bankDetailsSchema } from "@/lib/validators";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    if (session.id !== id && !hasModule(session, "users")) {
      return jsonError("Forbidden", 403);
    }

    await connectDB();
    const user = await User.findById(id).select("-passwordHash").lean();
    if (!user) return jsonError("User not found", 404);

    return jsonOk({
      user: { ...user, _id: user._id.toString() },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    await connectDB();
    const user = await User.findById(id);
    if (!user) return jsonError("User not found", 404);

    const isSelf = session.id === id;
    const canManageUsers = hasModule(session, "users");

    if (body.bankDetails) {
      if (!isSelf && !canManageUsers) {
        return jsonError("Forbidden", 403);
      }
      const parsed = bankDetailsSchema.safeParse(body.bankDetails);
      if (!parsed.success) {
        return jsonError("Validation failed", 400, parsed.error.flatten());
      }
      user.bankDetails = parsed.data;
      await user.save();
      return jsonOk({ user: { _id: user._id.toString(), bankDetails: user.bankDetails } });
    }

    if (!canManageUsers && !(session.roleSlug === ROLES.FINANCE && canManageRole(session.roleSlug, user.roleSlug))) {
      return jsonError("Forbidden", 403);
    }

    const parsed = userUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }

    if (parsed.data.roleSlug) {
      const roleSlug = parsed.data.roleSlug.toUpperCase();
      if (!canManageRole(session.roleSlug, roleSlug)) {
        return jsonError("You cannot assign this role", 403);
      }
      const role = await Role.findOne({ slug: roleSlug, active: true });
      if (!role) return jsonError("Invalid or inactive role", 400);
      user.roleSlug = roleSlug;
    }

    if (parsed.data.name) user.name = parsed.data.name;
    if (parsed.data.status) user.status = parsed.data.status;
    if (parsed.data.password) {
      user.passwordHash = await hashPassword(parsed.data.password);
    }

    await user.save();

    return jsonOk({
      user: {
        _id: user._id.toString(),
        phone: user.phone,
        name: user.name,
        roleSlug: user.roleSlug,
        status: user.status,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireModule("users");
    const { id } = await params;

    await connectDB();
    const user = await User.findByIdAndUpdate(
      id,
      { status: "INACTIVE" },
      { new: true }
    ).select("-passwordHash");

    if (!user) return jsonError("User not found", 404);
    return jsonOk({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
