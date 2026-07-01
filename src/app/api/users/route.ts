import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Role } from "@/models/Role";
import {
  requireModule,
  requireAnyModule,
  hashPassword,
  canManageRole,
} from "@/lib/auth";
import { userCreateSchema } from "@/lib/validators";
import { parseListQuery, buildTextSearch, paginateMeta } from "@/lib/pagination";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { normalizePhone } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const session = await requireAnyModule(["users", "reports", "events"]);
    await connectDB();

    const { searchParams } = new URL(request.url);
    const { page, limit, search, sort, filters } = parseListQuery(searchParams);

    const query: Record<string, unknown> = {
      ...buildTextSearch(search, ["name", "phone"]),
    };

    if (filters.roleSlug) query.roleSlug = String(filters.roleSlug).toUpperCase();
    if (filters.role) query.roleSlug = String(filters.role).toUpperCase();
    if (filters.status) query.status = filters.status;

    if (session.roleSlug === ROLES.DIRECTOR) {
      query.roleSlug = ROLES.EMPLOYEE;
      query.status = "ACTIVE";
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(query)
        .select("-passwordHash")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return jsonOk({
      data: users.map((u) => ({
        ...u,
        _id: u._id.toString(),
        createdBy: u.createdBy?.toString(),
      })),
      meta: paginateMeta(total, page, limit),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireModule("users");
    const body = await request.json();
    const parsed = userCreateSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }

    const roleSlug = parsed.data.roleSlug.toUpperCase();

    if (!canManageRole(session.roleSlug, roleSlug)) {
      return jsonError("You cannot create users with this role", 403);
    }

    await connectDB();

    const role = await Role.findOne({ slug: roleSlug, active: true });
    if (!role) {
      return jsonError("Invalid or inactive role", 400);
    }

    const phone = normalizePhone(parsed.data.phone);
    const exists = await User.findOne({ phone });
    if (exists) {
      return jsonError("Phone number already registered", 409);
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await User.create({
      phone,
      passwordHash,
      name: parsed.data.name,
      roleSlug,
      status: parsed.data.status || "ACTIVE",
      createdBy: session.id,
    });

    return jsonOk(
      {
        user: {
          _id: user._id.toString(),
          phone: user.phone,
          name: user.name,
          roleSlug: user.roleSlug,
          status: user.status,
        },
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
