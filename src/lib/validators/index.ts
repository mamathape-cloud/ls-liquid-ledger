import { z } from "zod";
import { ROLES, BUDGET_TYPES } from "@/lib/constants";
import { normalizePhone } from "@/lib/utils";

const phoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .transform(normalizePhone)
  .refine((v) => /^\d{10}$/.test(v), "Enter a valid 10-digit phone number");

const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters");

export const loginSchema = z.object({
  phone: phoneSchema,
  password: passwordSchema,
});

export const userCreateSchema = z.object({
  phone: phoneSchema,
  password: passwordSchema,
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum([
    ROLES.SYSTEM_ADMIN,
    ROLES.FINANCE,
    ROLES.DIRECTOR,
    ROLES.EMPLOYEE,
  ]),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const userUpdateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  role: z
    .enum([ROLES.SYSTEM_ADMIN, ROLES.FINANCE, ROLES.DIRECTOR, ROLES.EMPLOYEE])
    .optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  password: passwordSchema.optional(),
});

export const bankDetailsSchema = z
  .object({
    upiId: z.string().trim().optional(),
    accountNumber: z.string().trim().optional(),
    ifsc: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase())
      .optional(),
    accountName: z.string().trim().optional(),
  })
  .refine(
    (data) =>
      Boolean(data.upiId) ||
      (Boolean(data.accountNumber) &&
        Boolean(data.ifsc) &&
        Boolean(data.accountName)),
    {
      message: "Provide UPI ID or complete bank details (account, IFSC, name)",
      path: ["upiId"],
    }
  );

export const categorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters"),
  active: z.boolean().optional(),
});

export const eventSchema = z
  .object({
    name: z.string().min(2, "Event name is required"),
    description: z.string().optional(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    budgetType: z.enum([BUDGET_TYPES.PER_EVENT, BUDGET_TYPES.PER_EMPLOYEE]),
    eventBudget: z.coerce.number().min(0).optional(),
    assignedEmployees: z
      .array(
        z.object({
          employeeId: z.string().min(1, "Employee is required"),
          preApprovedBudget: z.coerce
            .number()
            .min(0, "Budget must be 0 or more"),
        })
      )
      .min(1, "Assign at least one employee"),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "End date must be on or after start date",
    path: ["endDate"],
  })
  .refine(
    (data) =>
      data.budgetType !== BUDGET_TYPES.PER_EVENT ||
      (data.eventBudget !== undefined && data.eventBudget > 0),
    {
      message: "Event budget is required for per-event budget type",
      path: ["eventBudget"],
    }
  );

export const claimReviewSchema = z
  .object({
    action: z.enum(["approve", "reject"]),
    rejectionReason: z.string().optional(),
  })
  .refine(
    (data) => data.action !== "reject" || Boolean(data.rejectionReason?.trim()),
    {
      message: "Rejection reason is required",
      path: ["rejectionReason"],
    }
  );

export const batchClaimReviewSchema = z
  .object({
    approvedClaimIds: z.array(z.string()),
    rejectionReason: z.string().optional(),
  })
  .refine(
    (data) => {
      // rejectionReason required when partial or full reject - validated in handler
      return true;
    },
    { message: "Invalid review data" }
  );

export const batchReviewSchema = claimReviewSchema;

export const batchCreateSchema = z.object({
  eventId: z.string().min(1, "Event is required"),
  claimIds: z.array(z.string()).min(1, "Select at least one claim"),
});

export const disburseSchema = z.object({
  claimIds: z.array(z.string()).min(1, "Select at least one claim"),
  paymentRef: z.string().min(1, "Payment reference is required"),
});
