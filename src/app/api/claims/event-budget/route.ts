import { connectDB } from "@/lib/db";
import { Claim } from "@/models/Claim";
import { Event } from "@/models/Event";
import { requireModule } from "@/lib/auth";
import { sumActiveClaimAmounts } from "@/lib/claim-budget";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const session = await requireModule("my_claims");
    const eventId = new URL(request.url).searchParams.get("eventId")?.trim();

    if (!eventId) {
      return jsonError("eventId is required", 400);
    }

    await connectDB();

    const event = await Event.findById(eventId).lean();
    if (!event || event.status !== "ACTIVE") {
      return jsonError("Event not found or inactive", 404);
    }

    const assignment = event.assignedEmployees.find(
      (a) => a.employeeId.toString() === session.id
    );
    if (!assignment) {
      return jsonError("You are not assigned to this event", 403);
    }

    const claims = await Claim.find({
      eventId,
      employeeId: session.id,
    })
      .select("amount status")
      .lean();

    const assignedBudget = assignment.preApprovedBudget;
    const claimedAmount = sumActiveClaimAmounts(claims);

    return jsonOk({
      assignedBudget,
      claimedAmount,
      remaining: assignedBudget - claimedAmount,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
