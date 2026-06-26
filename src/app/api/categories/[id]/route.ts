import { connectDB } from "@/lib/db";
import { Category } from "@/models/Category";
import { requireRoles } from "@/lib/auth";
import { categorySchema } from "@/lib/validators";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRoles([ROLES.SYSTEM_ADMIN]);
    const { id } = await params;
    const body = await request.json();
    const parsed = categorySchema.partial().safeParse(body);

    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }

    await connectDB();
    const category = await Category.findByIdAndUpdate(id, parsed.data, {
      new: true,
    });

    if (!category) return jsonError("Category not found", 404);
    return jsonOk({ category });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRoles([ROLES.SYSTEM_ADMIN]);
    const { id } = await params;

    await connectDB();
    const category = await Category.findByIdAndUpdate(
      id,
      { active: false },
      { new: true }
    );

    if (!category) return jsonError("Category not found", 404);
    return jsonOk({ category });
  } catch (error) {
    return handleApiError(error);
  }
}
