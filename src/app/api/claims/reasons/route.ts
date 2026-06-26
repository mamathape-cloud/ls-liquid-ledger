import { connectDB } from "@/lib/db";
import { Claim } from "@/models/Claim";
import { requireAuth } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";

export async function GET(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";

    if (!q || q.length < 2) {
      return jsonOk({ suggestions: [] });
    }

    await connectDB();
    const claims = await Claim.find({
      reason: { $regex: q, $options: "i" },
    })
      .distinct("reason")
      .then((reasons: string[]) =>
        reasons.filter(Boolean).slice(0, 10)
      );

    return jsonOk({ suggestions: claims });
  } catch (error) {
    return handleApiError(error);
  }
}
