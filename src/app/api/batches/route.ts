import { connectDB } from "@/lib/db";
import { ApprovalBatch } from "@/models/ApprovalBatch";
import { Claim } from "@/models/Claim";
import { Event } from "@/models/Event";
import { User } from "@/models/User";
import { requireRoles } from "@/lib/auth";
import { batchCreateSchema } from "@/lib/validators";
import { sendNotifications } from "@/lib/notifications";
import { parseListQuery, buildTextSearch, paginateMeta } from "@/lib/pagination";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import {
  ROLES,
  CLAIM_STATUSES,
  BATCH_STATUSES,
} from "@/lib/constants";
import { generateBatchId } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const session = await requireRoles([
      ROLES.FINANCE,
      ROLES.DIRECTOR,
      ROLES.SYSTEM_ADMIN,
    ]);
    await connectDB();

    const { searchParams } = new URL(request.url);
    const { page, limit, search, sort, filters } = parseListQuery(searchParams);

    const query: Record<string, unknown> = {
      ...buildTextSearch(search, ["batchId"]),
    };

    if (filters.status) query.status = filters.status;
    if (filters.eventId) query.eventId = filters.eventId;

    if (session.role === ROLES.DIRECTOR) {
      query.status = { $ne: BATCH_STATUSES.DRAFT };
    }

    const skip = (page - 1) * limit;
    const [batches, total] = await Promise.all([
      ApprovalBatch.find(query)
        .populate("eventId", "name")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      ApprovalBatch.countDocuments(query),
    ]);

    return jsonOk({
      data: batches.map((b) => ({
        _id: b._id.toString(),
        batchId: b.batchId,
        eventId: (b.eventId as { _id?: { toString: () => string }; name?: string })?._id?.toString?.() || String(b.eventId),
        eventName: (b.eventId as { name?: string })?.name,
        claimIds: b.claimIds.map((id) => id.toString()),
        totalAmount: b.totalAmount,
        status: b.status,
        submittedAt: b.submittedAt,
        createdAt: b.createdAt,
      })),
      meta: paginateMeta(total, page, limit),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRoles([ROLES.FINANCE]);
    const body = await request.json();
    const parsed = batchCreateSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }

    await connectDB();

    const claims = await Claim.find({
      _id: { $in: parsed.data.claimIds },
      eventId: parsed.data.eventId,
      status: CLAIM_STATUSES.FINANCE_APPROVED,
      batchId: { $exists: false },
    });

    if (claims.length !== parsed.data.claimIds.length) {
      return jsonError(
        "All selected claims must be finance-approved and not already batched",
        400
      );
    }

    const totalAmount = claims.reduce((sum, c) => sum + c.amount, 0);
    let batchId = await generateBatchId();

    const batch = await ApprovalBatch.create({
      batchId,
      eventId: parsed.data.eventId,
      claimIds: parsed.data.claimIds,
      status: BATCH_STATUSES.SUBMITTED,
      submittedBy: session.id,
      submittedAt: new Date(),
      totalAmount,
    });

    await Claim.updateMany(
      { _id: { $in: parsed.data.claimIds } },
      {
        batchId: batch._id,
        status: CLAIM_STATUSES.IN_DIRECTOR_REVIEW,
      }
    );

    const directors = await User.find({
      role: ROLES.DIRECTOR,
      status: "ACTIVE",
    }).select("_id");

    await sendNotifications(
      directors.map((d) => ({
        userId: d._id.toString(),
        type: "BATCH_SUBMITTED",
        title: "Approval batch submitted",
        message: `Finance submitted batch ${batchId} for your approval.`,
        link: `/director/batches?batchId=${batchId}`,
      }))
    );

    return jsonOk({ batch }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
