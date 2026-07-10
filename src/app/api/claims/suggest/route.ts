import { connectDB } from "@/lib/db";
import { Claim } from "@/models/Claim";
import { requireAuth } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";

const APPROVER_MODULES = [
  "review_claims",
  "director_batches",
  "disburse",
  "batches",
  "users",
  "all_profiles",
  "reports",
];

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";

    if (!q || q.length < 2) {
      return jsonOk({ suggestions: [] });
    }

    await connectDB();

    const canSeeAllClaims = session.permissions?.some((p) =>
      APPROVER_MODULES.includes(p)
    );

    const query: Record<string, unknown> = {
      claimId: { $regex: q, $options: "i" },
    };

    if (!canSeeAllClaims) {
      query.employeeId = session.id;
    }

    const suggestions = await Claim.find(query)
      .sort({ createdAt: -1 })
      .limit(10)
      .select("claimId")
      .lean()
      .then((claims) => claims.map((c) => c.claimId));

    return jsonOk({ suggestions });
  } catch (error) {
    return handleApiError(error);
  }
}
