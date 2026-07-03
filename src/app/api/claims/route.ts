import { connectDB } from "@/lib/db";
import { Claim } from "@/models/Claim";
import { Event } from "@/models/Event";
import { Category } from "@/models/Category";
import { User } from "@/models/User";
import { requireAuth, requireModule, getUserIdsWithModule } from "@/lib/auth";
import { getStorageProvider } from "@/lib/storage";
import { sendNotifications } from "@/lib/notifications";
import { parseListQuery, buildTextSearch, paginateMeta } from "@/lib/pagination";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import {
  ROLES,
  CLAIM_STATUSES,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from "@/lib/constants";
import { generateClaimId } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    await connectDB();

    const { searchParams } = new URL(request.url);
    const { page, limit, search, sort, filters } = parseListQuery(searchParams);
    const claimIdSearch = searchParams.get("claimId")?.trim();

    const query: Record<string, unknown> = {};

    if (claimIdSearch) {
      query.claimId = { $regex: claimIdSearch, $options: "i" };
    } else if (search) {
      Object.assign(query, buildTextSearch(search, ["claimId", "reason"]));
    }

    if (filters.status) query.status = filters.status;
    if (filters.eventId) query.eventId = filters.eventId;
    if (filters.unbatched === "true") {
      query.batchId = { $exists: false };
    }

    const dateFrom = filters.dateFrom;
    const dateTo = filters.dateTo;
    if (dateFrom || dateTo) {
      const claimDate: Record<string, Date> = {};
      if (dateFrom) claimDate.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        claimDate.$lte = end;
      }
      query.claimDate = claimDate;
    }

    if (session.roleSlug === ROLES.EMPLOYEE) {
      query.employeeId = session.id;
    }

    const skip = (page - 1) * limit;
    const [claims, total] = await Promise.all([
      Claim.find(query)
        .populate("eventId", "name")
        .populate("employeeId", "name phone")
        .populate("categoryId", "name")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Claim.countDocuments(query),
    ]);

    return jsonOk({
      data: claims.map((c) => ({
        _id: c._id.toString(),
        claimId: c.claimId,
        eventId: (c.eventId as { _id?: { toString: () => string }; name?: string })?._id?.toString?.() || String(c.eventId),
        eventName: (c.eventId as { name?: string })?.name,
        employeeId: (c.employeeId as { _id?: { toString: () => string }; name?: string })?._id?.toString?.() || String(c.employeeId),
        employeeName: (c.employeeId as { name?: string })?.name,
        amount: c.amount,
        claimDate: c.claimDate,
        reason: c.reason,
        categoryId: (c.categoryId as { _id?: { toString: () => string }; name?: string })?._id?.toString?.() || String(c.categoryId),
        categoryName: (c.categoryId as { name?: string })?.name,
        status: c.status,
        batchId: c.batchId?.toString(),
        financeRejectionReason: c.financeRejectionReason,
        directorRejectionReason: c.directorRejectionReason,
        proofFiles: c.proofFiles,
        createdAt: c.createdAt,
      })),
      meta: paginateMeta(total, page, limit),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireModule("my_claims");
    const formData = await request.formData();

    const eventId = String(formData.get("eventId") || "");
    const amount = Number(formData.get("amount"));
    const claimDate = String(formData.get("claimDate") || "");
    const reason = String(formData.get("reason") || "").trim();
    const categoryId = String(formData.get("categoryId") || "");
    const files = formData.getAll("proofFiles").filter((f) => f instanceof File) as File[];

    const errors: Record<string, string> = {};
    if (!eventId) errors.eventId = "Event is required";
    if (!amount || amount <= 0) errors.amount = "Valid claim amount is required";
    if (!claimDate) errors.claimDate = "Claim date is required";
    if (!reason) errors.reason = "Reason is required";
    if (!categoryId) errors.categoryId = "Category is required";
    if (!files.length) errors.proofFiles = "At least one proof file is required";

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        errors.proofFiles = "Only PDF, DOCX, DOC, and image files are allowed";
        break;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.proofFiles = "Each file must be under 10MB";
        break;
      }
    }

    if (Object.keys(errors).length) {
      return jsonError("Validation failed", 400, errors);
    }

    await connectDB();

    const event = await Event.findById(eventId);
    if (!event || event.status !== "ACTIVE") {
      return jsonError("Event not found or inactive", 400);
    }

    const assigned = event.assignedEmployees.find(
      (a) => a.employeeId.toString() === session.id
    );
    if (!assigned) {
      return jsonError("You are not assigned to this event", 403);
    }

    const category = await Category.findOne({ _id: categoryId, active: true });
    if (!category) {
      return jsonError("Invalid category", 400);
    }

    const storage = getStorageProvider();
    const proofFiles = await Promise.all(files.map((f) => storage.save(f)));

    let claimId = await generateClaimId();
    let attempts = 0;
    while (attempts < 5) {
      const exists = await Claim.findOne({ claimId });
      if (!exists) break;
      claimId = await generateClaimId();
      attempts++;
    }

    const claim = await Claim.create({
      claimId,
      eventId,
      employeeId: session.id,
      amount,
      claimDate: new Date(claimDate),
      reason,
      categoryId,
      proofFiles,
      status: CLAIM_STATUSES.SUBMITTED,
    });

    const financeUserIds = await getUserIdsWithModule("review_claims");

    await sendNotifications(
      financeUserIds.map((userId) => ({
        userId,
        type: "CLAIM_SUBMITTED",
        title: "New claim submitted",
        message: `${session.name} submitted claim ${claimId} for review.`,
        link: `/finance/claims?claimId=${claimId}`,
      }))
    );

    return jsonOk({ claim }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
