import { connectDB } from "@/lib/db";
import { Event } from "@/models/Event";
import { requireRoles } from "@/lib/auth";
import { eventSchema } from "@/lib/validators";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRoles([
      ROLES.FINANCE,
      ROLES.EMPLOYEE,
      ROLES.DIRECTOR,
      ROLES.SYSTEM_ADMIN,
    ]);
    const { id } = await params;
    await connectDB();

    const event = await Event.findById(id)
      .populate("assignedEmployees.employeeId", "name phone")
      .populate("createdBy", "name")
      .lean();

    if (!event) return jsonError("Event not found", 404);
    return jsonOk({ event });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRoles([ROLES.FINANCE]);
    const { id } = await params;
    const body = await request.json();
    const parsed = eventSchema.partial().safeParse(body);

    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }

    await connectDB();
    const update: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.startDate) update.startDate = new Date(parsed.data.startDate);
    if (parsed.data.endDate) update.endDate = new Date(parsed.data.endDate);

    const event = await Event.findByIdAndUpdate(id, update, { new: true });
    if (!event) return jsonError("Event not found", 404);

    return jsonOk({ event });
  } catch (error) {
    return handleApiError(error);
  }
}
