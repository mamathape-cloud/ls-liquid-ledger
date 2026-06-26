import { connectDB } from "@/lib/db";
import { Category } from "@/models/Category";
import { requireRoles } from "@/lib/auth";
import { categorySchema } from "@/lib/validators";
import { parseListQuery, buildTextSearch, paginateMeta } from "@/lib/pagination";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export async function GET(request: Request) {
  try {
    const session = await requireRoles([
      ROLES.SYSTEM_ADMIN,
      ROLES.FINANCE,
      ROLES.EMPLOYEE,
      ROLES.DIRECTOR,
    ]);
    await connectDB();

    const { searchParams } = new URL(request.url);
    const { page, limit, search, sort, filters } = parseListQuery(searchParams);

    const query: Record<string, unknown> = {
      ...buildTextSearch(search, ["name"]),
    };

    if (session.role === ROLES.EMPLOYEE) {
      query.active = true;
    } else if (filters.active) {
      query.active = filters.active === "true";
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Category.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Category.countDocuments(query),
    ]);

    return jsonOk({
      data: data.map((c) => ({ ...c, _id: c._id.toString() })),
      meta: paginateMeta(total, page, limit),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRoles([ROLES.SYSTEM_ADMIN]);
    const body = await request.json();
    const parsed = categorySchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }

    await connectDB();
    const exists = await Category.findOne({
      name: { $regex: `^${parsed.data.name}$`, $options: "i" },
    });
    if (exists) {
      return jsonError("Category already exists", 409);
    }

    const category = await Category.create({
      ...parsed.data,
      createdBy: session.id,
    });

    return jsonOk({ category }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
