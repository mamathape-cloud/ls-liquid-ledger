import { connectDB } from "@/lib/db";
import { Event } from "@/models/Event";
import { Claim } from "@/models/Claim";
import { requireModule, requireAnyModule } from "@/lib/auth";
import { eventUpdateSchema } from "@/lib/validators";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { EVENT_STATUSES } from "@/lib/constants";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAnyModule(["events", "my_claims", "event_expenses", "review_claims", "batches", "director_batches"]);
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
    await requireModule("events");
    const { id } = await params;
    const body = await request.json();
    const parsed = eventUpdateSchema.safeParse(body);

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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireModule("events");
    const { id } = await params;
    await connectDB();

    const event = await Event.findById(id);
    if (!event) return jsonError("Event not found", 404);

    const claimCount = await Claim.countDocuments({ eventId: id });
    if (claimCount > 0) {
      event.status = EVENT_STATUSES.CLOSED;
      await event.save();
      return jsonOk({
        event,
        closed: true,
        message: "Event has linked claims and was closed instead of deleted",
      });
    }

    await Event.findByIdAndDelete(id);
    return jsonOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
