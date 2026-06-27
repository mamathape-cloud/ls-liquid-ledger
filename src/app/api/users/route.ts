import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import {
  requireRoles,
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
    const session = await requireRoles([
      ROLES.SYSTEM_ADMIN,
      ROLES.FINANCE,
      ROLES.DIRECTOR,
    ]);
    await connectDB();

    const { searchParams } = new URL(request.url);
    const { page, limit, search, sort, filters } = parseListQuery(searchParams);

    const query: Record<string, unknown> = {
      ...buildTextSearch(search, ["name", "phone"]),
    };

    if (filters.role) query.role = filters.role;
    if (filters.status) query.status = filters.status;

    if (session.role === ROLES.DIRECTOR) {
      query.role = ROLES.EMPLOYEE;
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
    const session = await requireRoles([
      ROLES.SYSTEM_ADMIN,
      ROLES.FINANCE,
    ]);
    const body = await request.json();
    const parsed = userCreateSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }

    if (!canManageRole(session.role, parsed.data.role)) {
      return jsonError("You cannot create users with this role", 403);
    }

    await connectDB();
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
      role: parsed.data.role,
      status: parsed.data.status || "ACTIVE",
      createdBy: session.id,
    });

    return jsonOk(
      {
        user: {
          _id: user._id.toString(),
          phone: user.phone,
          name: user.name,
          role: user.role,
          status: user.status,
        },
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
