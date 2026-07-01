import { connectDB } from "@/lib/db";
import { Role } from "@/models/Role";
import { User } from "@/models/User";
import { requireModule, requireAnyModule } from "@/lib/auth";
import { roleCreateSchema } from "@/lib/validators";
import { parseListQuery, paginateMeta } from "@/lib/pagination";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { sanitizeModules } from "@/lib/modules";

export async function GET(request: Request) {
  try {
    await requireAnyModule(["roles", "users"]);
    await connectDB();

    const { searchParams } = new URL(request.url);
    const { page, limit, sort } = parseListQuery(searchParams);
    const activeOnly = searchParams.get("active") === "true";

    const query: Record<string, unknown> = {};
    if (activeOnly) query.active = true;

    const skip = (page - 1) * limit;
    const [roles, total] = await Promise.all([
      Role.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Role.countDocuments(query),
    ]);

    return jsonOk({
      data: roles.map((r) => ({
        ...r,
        _id: r._id.toString(),
        createdBy: r.createdBy?.toString(),
      })),
      meta: paginateMeta(total, page, limit),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireModule("roles");
    const body = await request.json();
    const parsed = roleCreateSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }

    await connectDB();

    const slug = parsed.data.slug.toUpperCase();
    const exists = await Role.findOne({ slug });
    if (exists) {
      return jsonError("Role slug already exists", 409);
    }

    const modules = sanitizeModules(parsed.data.modules);
    if (!modules.length) {
      return jsonError("Select at least one valid module", 400);
    }

    const role = await Role.create({
      name: parsed.data.name.trim(),
      slug,
      modules,
      isSystem: false,
      active: parsed.data.active ?? true,
      createdBy: session.id,
    });

    return jsonOk(
      {
        role: {
          _id: role._id.toString(),
          name: role.name,
          slug: role.slug,
          modules: role.modules,
          isSystem: role.isSystem,
          active: role.active,
        },
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
