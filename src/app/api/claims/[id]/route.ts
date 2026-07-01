import { connectDB } from "@/lib/db";
import { Claim } from "@/models/Claim";
import { Category } from "@/models/Category";
import { Event } from "@/models/Event";
import { requireAuth, requireModule } from "@/lib/auth";
import { getStorageProvider } from "@/lib/storage";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { ROLES, CLAIM_STATUSES, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/constants";
import { z } from "zod";

const claimUpdateSchema = z.object({
  amount: z.coerce.number().min(0.01).optional(),
  claimDate: z.string().min(1).optional(),
  reason: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    await connectDB();

    const claim = await Claim.findById(id)
      .populate("eventId", "name")
      .populate("employeeId", "name phone bankDetails")
      .populate("categoryId", "name")
      .populate("financeReviewerId", "name")
      .populate("disbursedBy", "name")
      .lean();

    if (!claim) return jsonError("Claim not found", 404);

    const employeeId =
      typeof claim.employeeId === "object" && claim.employeeId !== null
        ? (claim.employeeId as { _id: { toString: () => string } })._id.toString()
        : String(claim.employeeId);

    if (session.roleSlug === ROLES.EMPLOYEE && employeeId !== session.id) {
      return jsonError("Forbidden", 403);
    }

    return jsonOk({ claim });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireModule("my_claims");
    const { id } = await params;
    await connectDB();

    const claim = await Claim.findById(id);
    if (!claim) return jsonError("Claim not found", 404);
    if (claim.employeeId.toString() !== session.id) {
      return jsonError("Forbidden", 403);
    }
    if (claim.status !== CLAIM_STATUSES.SUBMITTED) {
      return jsonError("Only submitted claims can be edited", 400);
    }

    const contentType = request.headers.get("content-type") || "";
    let body: Record<string, unknown> = {};

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      body = {
        amount: formData.get("amount"),
        claimDate: formData.get("claimDate"),
        reason: formData.get("reason"),
        categoryId: formData.get("categoryId"),
      };
      const newFiles = formData
        .getAll("proofFiles")
        .filter((f) => f instanceof File) as File[];

      for (const file of newFiles) {
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          return jsonError("Only PDF, DOCX, DOC, and image files are allowed", 400);
        }
        if (file.size > MAX_FILE_SIZE) {
          return jsonError("Each file must be under 10MB", 400);
        }
      }

      if (newFiles.length) {
        const storage = getStorageProvider();
        const uploaded = await Promise.all(newFiles.map((f) => storage.save(f)));
        for (const file of uploaded) {
          claim.proofFiles.push(file);
        }
      }
    } else {
      body = await request.json();
    }

    const parsed = claimUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }

    if (parsed.data.amount !== undefined) claim.amount = parsed.data.amount;
    if (parsed.data.claimDate) claim.claimDate = new Date(parsed.data.claimDate);
    if (parsed.data.reason) claim.reason = parsed.data.reason;
    if (parsed.data.categoryId) {
      const category = await Category.findOne({
        _id: parsed.data.categoryId,
        active: true,
      });
      if (!category) return jsonError("Invalid category", 400);
      claim.categoryId = category._id;
    }

    await claim.save();
    return jsonOk({ claim });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireModule("my_claims");
    const { id } = await params;
    await connectDB();

    const claim = await Claim.findById(id);
    if (!claim) return jsonError("Claim not found", 404);
    if (claim.employeeId.toString() !== session.id) {
      return jsonError("Forbidden", 403);
    }
    if (claim.status !== CLAIM_STATUSES.SUBMITTED) {
      return jsonError("Only submitted claims can be deleted", 400);
    }

    const storage = getStorageProvider();
    for (const file of claim.proofFiles || []) {
      await storage.delete(file.storedPath);
    }

    await claim.deleteOne();
    return jsonOk({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
