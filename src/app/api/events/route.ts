import { connectDB } from "@/lib/db";
import { Event } from "@/models/Event";
import { User } from "@/models/User";
import { requireModule, requireAnyModule } from "@/lib/auth";
import { eventSchema } from "@/lib/validators";
import { parseListQuery, buildTextSearch, paginateMeta } from "@/lib/pagination";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { ROLES } from "@/lib/constants";

export async function GET(request: Request) {
  try {
    const session = await requireAnyModule(["events", "my_claims", "event_expenses", "review_claims", "batches", "director_batches"]);
    await connectDB();

    const { searchParams } = new URL(request.url);
    const { page, limit, search, sort, filters } = parseListQuery(searchParams);

    const query: Record<string, unknown> = {
      ...buildTextSearch(search, ["name", "description"]),
    };

    if (filters.status) query.status = filters.status;

    if (session.roleSlug === ROLES.EMPLOYEE) {
      query["assignedEmployees.employeeId"] = session.id;
      query.status = "ACTIVE";
    }

    const skip = (page - 1) * limit;
    const [events, total] = await Promise.all([
      Event.find(query)
        .populate("createdBy", "name")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Event.countDocuments(query),
    ]);

    return jsonOk({
      data: events.map((e) => ({
        ...e,
        _id: e._id.toString(),
        createdBy: e.createdBy,
        assignedEmployees: e.assignedEmployees.map((a) => ({
          employeeId: a.employeeId.toString(),
          preApprovedBudget: a.preApprovedBudget,
        })),
      })),
      meta: paginateMeta(total, page, limit),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireModule("events");
    const body = await request.json();
    const parsed = eventSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }

    await connectDB();

    const employeeIds = parsed.data.assignedEmployees.map((a) => a.employeeId);
    const uniqueIds = new Set(employeeIds);
    if (uniqueIds.size !== employeeIds.length) {
      const seen = new Set<string>();
      for (const id of employeeIds) {
        if (seen.has(id)) {
          const dup = await User.findById(id).select("name");
          return jsonError(
            `${dup?.name || "This employee"} is assigned more than once to this event. Each employee can only be added once.`,
            400
          );
        }
        seen.add(id);
      }
    }

    const employees = await User.find({
      _id: { $in: employeeIds },
      roleSlug: ROLES.EMPLOYEE,
      status: "ACTIVE",
    });

    if (employees.length !== employeeIds.length) {
      const foundIds = new Set(employees.map((e) => e._id.toString()));
      const missing = employeeIds.filter((id) => !foundIds.has(id));
      if (missing.length) {
        const invalid = await User.find({ _id: { $in: missing } }).select("name roleSlug status");
        if (invalid.length) {
          const u = invalid[0];
          if (u.roleSlug !== ROLES.EMPLOYEE) {
            return jsonError(`${u.name} is not an employee and cannot be assigned to events`, 400);
          }
          if (u.status !== "ACTIVE") {
            return jsonError(`${u.name} is inactive and cannot be assigned to events`, 400);
          }
        }
      }
      return jsonError("One or more selected employees are invalid or inactive", 400);
    }

    const event = await Event.create({
      name: parsed.data.name,
      description: parsed.data.description,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
      budgetType: parsed.data.budgetType,
      eventBudget: parsed.data.eventBudget,
      allowFutureDatedClaims: parsed.data.allowFutureDatedClaims ?? false,
      assignedEmployees: parsed.data.assignedEmployees,
      createdBy: session.id,
    });

    return jsonOk({ event }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
