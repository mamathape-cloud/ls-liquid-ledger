import { connectDB } from "@/lib/db";
import { Role } from "@/models/Role";
import { User } from "@/models/User";
import { requireModule } from "@/lib/auth";
import { roleUpdateSchema } from "@/lib/validators";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { sanitizeModules } from "@/lib/modules";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireModule("roles");
    const { id } = await params;
    await connectDB();

    const role = await Role.findById(id).lean();
    if (!role) return jsonError("Role not found", 404);

    return jsonOk({
      role: {
        ...role,
        _id: role._id.toString(),
        createdBy: role.createdBy?.toString(),
      },
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
    await requireModule("roles");
    const { id } = await params;
    const body = await request.json();
    const parsed = roleUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }

    await connectDB();
    const role = await Role.findById(id);
    if (!role) return jsonError("Role not found", 404);

    if (parsed.data.name) role.name = parsed.data.name.trim();
    if (parsed.data.modules) {
      const modules = sanitizeModules(parsed.data.modules);
      if (!modules.length) {
        return jsonError("Select at least one valid module", 400);
      }
      role.modules = modules;
    }
    if (parsed.data.active !== undefined) role.active = parsed.data.active;

    await role.save();

    return jsonOk({
      role: {
        _id: role._id.toString(),
        name: role.name,
        slug: role.slug,
        modules: role.modules,
        isSystem: role.isSystem,
        active: role.active,
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
    await requireModule("roles");
    const { id } = await params;
    await connectDB();

    const role = await Role.findById(id);
    if (!role) return jsonError("Role not found", 404);

    if (role.isSystem) {
      return jsonError("System roles cannot be deleted", 400);
    }

    const userCount = await User.countDocuments({ roleSlug: role.slug, status: "ACTIVE" });
    if (userCount > 0) {
      return jsonError("Cannot delete role with active users assigned", 400);
    }

    await role.deleteOne();
    return jsonOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
