import { connectDB } from "@/lib/db";
import { Event } from "@/models/Event";
import { User } from "@/models/User";
import { requireModule } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { z } from "zod";

const addEmployeeSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  preApprovedBudget: z.coerce
    .number({ error: "Valid budget is required" })
    .refine((n) => Number.isFinite(n) && n > 0, {
      message: "Budget must be greater than 0",
    }),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireModule("events");
    const { id } = await params;
    const body = await request.json();
    const parsed = addEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }

    await connectDB();
    const event = await Event.findById(id);
    if (!event) return jsonError("Event not found", 404);

    const employee = await User.findOne({
      _id: parsed.data.employeeId,
      roleSlug: ROLES.EMPLOYEE,
      status: "ACTIVE",
    });

    if (!employee) {
      return jsonError("Selected employee is invalid or inactive", 400);
    }

    const alreadyAssigned = event.assignedEmployees.some(
      (a) => a.employeeId.toString() === parsed.data.employeeId
    );

    if (alreadyAssigned) {
      return jsonError(
        `${employee.name} is already assigned to this event. Edit or remove the existing assignment instead.`,
        400
      );
    }

    event.assignedEmployees.push({
      employeeId: parsed.data.employeeId as unknown as typeof event.assignedEmployees[0]["employeeId"],
      preApprovedBudget: parsed.data.preApprovedBudget,
    });
    await event.save();

    return jsonOk({ event }, 201);
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
    const parsed = addEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }

    await connectDB();
    const event = await Event.findById(id);
    if (!event) return jsonError("Event not found", 404);

    const assignment = event.assignedEmployees.find(
      (a) => a.employeeId.toString() === parsed.data.employeeId
    );

    if (!assignment) {
      return jsonError("Employee is not assigned to this event", 404);
    }

    assignment.preApprovedBudget = parsed.data.preApprovedBudget;
    await event.save();

    return jsonOk({ event });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireModule("events");
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");

    if (!employeeId) {
      return jsonError("employeeId is required", 400);
    }

    await connectDB();
    const event = await Event.findById(id);
    if (!event) return jsonError("Event not found", 404);

    const index = event.assignedEmployees.findIndex(
      (a) => a.employeeId.toString() === employeeId
    );

    if (index === -1) {
      return jsonError("Employee is not assigned to this event", 404);
    }

    event.assignedEmployees.splice(index, 1);

    await event.save();
    return jsonOk({ event });
  } catch (error) {
    return handleApiError(error);
  }
}
