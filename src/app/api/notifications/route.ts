import { connectDB } from "@/lib/db";
import { Notification } from "@/models/Notification";
import { requireAuth } from "@/lib/auth";
import { parseListQuery, paginateMeta } from "@/lib/pagination";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    await connectDB();

    const { searchParams } = new URL(request.url);
    const { page, limit, sort } = parseListQuery(searchParams);
    const unreadOnly = searchParams.get("unread") === "true";
    const readFilter = searchParams.get("read");

    const query: Record<string, unknown> = { userId: session.id };
    if (unreadOnly) query.read = false;
    else if (readFilter === "true") query.read = true;
    else if (readFilter === "false") query.read = false;

    const skip = (page - 1) * limit;
    const [data, total, unreadCount] = await Promise.all([
      Notification.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId: session.id, read: false }),
    ]);

    return jsonOk({
      data: data.map((n) => ({ ...n, _id: n._id.toString() })),
      meta: paginateMeta(total, page, limit),
      unreadCount,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    await connectDB();

    if (body.markAllRead) {
      await Notification.updateMany(
        { userId: session.id, read: false },
        { read: true }
      );
      return jsonOk({ success: true });
    }

    if (!body.id) {
      return jsonError("Notification id is required", 400);
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: body.id, userId: session.id },
      { read: true },
      { new: true }
    );

    if (!notification) return jsonError("Notification not found", 404);
    return jsonOk({ notification });
  } catch (error) {
    return handleApiError(error);
  }
}
