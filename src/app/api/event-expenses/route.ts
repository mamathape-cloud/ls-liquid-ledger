import { connectDB } from "@/lib/db";
import { Event } from "@/models/Event";
import { EventExpensePlan } from "@/models/EventExpensePlan";
import { requireModule, requireAnyModule } from "@/lib/auth";
import { eventExpensePlanSchema } from "@/lib/validators";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { normalizeExpenseHeads } from "@/lib/event-expenses";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const listEvents = searchParams.get("listEvents") === "true";

    if (listEvents) {
      await requireAnyModule(["events", "event_expenses"]);
      await connectDB();
      const events = await Event.find({ status: "ACTIVE" })
        .select("name startDate endDate")
        .sort({ startDate: -1 })
        .limit(200)
        .lean();

      return jsonOk({
        data: events.map((e) => ({
          _id: e._id.toString(),
          name: e.name,
          startDate: e.startDate,
          endDate: e.endDate,
        })),
      });
    }

    await requireModule("event_expenses");
    await connectDB();

    const eventId = searchParams.get("eventId");
    if (!eventId) {
      return jsonError("eventId is required", 400);
    }

    const event = await Event.findById(eventId).select("name").lean();
    if (!event) return jsonError("Event not found", 404);

    const plan = await EventExpensePlan.findOne({ eventId }).lean();

    return jsonOk({
      plan: plan
        ? {
            _id: plan._id.toString(),
            eventId: plan.eventId.toString(),
            eventName: event.name,
            heads: plan.heads,
          }
        : {
            eventId,
            eventName: event.name,
            heads: [],
          },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireModule("event_expenses");
    const body = await request.json();
    const parsed = eventExpensePlanSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }

    await connectDB();

    const event = await Event.findById(parsed.data.eventId);
    if (!event) return jsonError("Event not found", 404);

    const headNames = new Set<string>();
    for (const head of parsed.data.heads) {
      const key = head.name.trim().toLowerCase();
      if (headNames.has(key)) {
        return jsonError(`Duplicate head: ${head.name}`, 400);
      }
      headNames.add(key);

      const subNames = new Set<string>();
      for (const sub of head.subHeads || []) {
        const subKey = sub.name.trim().toLowerCase();
        if (subNames.has(subKey)) {
          return jsonError(`Duplicate sub-head under ${head.name}: ${sub.name}`, 400);
        }
        subNames.add(subKey);
      }

      if ((head.subHeads?.length || 0) === 0 && (head.amount === undefined || head.amount < 0)) {
        return jsonError(`Amount required for head "${head.name}" when no sub-heads`, 400);
      }
    }

    const heads = normalizeExpenseHeads(parsed.data.heads);

    const plan = await EventExpensePlan.findOneAndUpdate(
      { eventId: parsed.data.eventId },
      {
        $set: {
          heads,
          updatedBy: session.id,
        },
        $setOnInsert: {
          createdBy: session.id,
        },
      },
      { upsert: true, new: true }
    ).lean();

    return jsonOk({
      plan: {
        _id: plan!._id.toString(),
        eventId: plan!.eventId.toString(),
        eventName: event.name,
        heads: plan!.heads,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
