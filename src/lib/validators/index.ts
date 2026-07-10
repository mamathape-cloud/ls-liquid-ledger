import { z } from "zod";
import { BUDGET_TYPES, EVENT_STATUSES } from "@/lib/constants";
import { normalizePhone } from "@/lib/utils";

function withinWordLimit(maxWords: number) {
  return (val?: string) => {
    if (!val?.trim()) return true;
    return val.trim().split(/\s+/).filter(Boolean).length <= maxWords;
  };
}

const descriptionSchema = z
  .string()
  .optional()
  .refine(withinWordLimit(250), {
    message: "Description must be 250 words or less",
  });

const eventBudgetAmountSchema = z.coerce
  .number({ error: "Valid budget is required" })
  .refine((n) => Number.isFinite(n) && n > 0, {
    message: "Budget must be greater than 0",
  });

const employeeAssignmentSchema = z.object({
  employeeId: z.string().min(1, "Please select an employee"),
  preApprovedBudget: eventBudgetAmountSchema,
});

const phoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .refine((v) => /^\d+$/.test(v), "Only numbers are allowed (no decimals or symbols)")
  .refine((v) => v.length === 10, "Phone number must be exactly 10 digits")
  .transform(normalizePhone);

const passwordSchema = z
  .string()
  .min(1, "Password is required")
  .min(6, "Password must be at least 6 characters");

export const loginSchema = z.object({
  phone: phoneSchema,
  password: passwordSchema,
});

export const userCreateSchema = z.object({
  phone: phoneSchema,
  password: passwordSchema,
  name: z.string().min(2, "Name must be at least 2 characters"),
  roleSlug: z.string().min(1, "Role is required"),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const userUpdateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  roleSlug: z.string().min(1).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  password: passwordSchema.optional(),
});

export const roleCreateSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug is required")
    .regex(/^[A-Z0-9_]+$/, "Use uppercase letters, numbers, and underscores"),
  modules: z.array(z.string()).min(1, "Select at least one module"),
  active: z.boolean().optional(),
});

export const roleUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  modules: z.array(z.string()).min(1).optional(),
  active: z.boolean().optional(),
});

const subHeadSchema = z.object({
  name: z.string().min(1, "Sub-head name is required"),
  amount: z.coerce.number().min(0, "Amount must be 0 or more"),
});

const expenseHeadSchema = z.object({
  name: z.string().min(1, "Head name is required"),
  amount: z.coerce.number().min(0).optional(),
  subHeads: z.array(subHeadSchema).default([]),
});

export const eventExpensePlanSchema = z.object({
  eventId: z.string().min(1, "Event is required"),
  heads: z.array(expenseHeadSchema),
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
    description: descriptionSchema,
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    budgetType: z.enum([BUDGET_TYPES.PER_EVENT, BUDGET_TYPES.PER_EMPLOYEE]),
    eventBudget: z.coerce.number().min(0).optional(),
    assignedEmployees: z
      .array(employeeAssignmentSchema)
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
      message: "Budget must be greater than 0",
      path: ["eventBudget"],
    }
  );

export const eventEditFormSchema = z
  .object({
    name: z.string().min(2, "Event name is required"),
    description: descriptionSchema,
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    budgetType: z.enum([BUDGET_TYPES.PER_EVENT, BUDGET_TYPES.PER_EMPLOYEE]),
    eventBudget: z.coerce.number().min(0).optional(),
    status: z.enum([EVENT_STATUSES.ACTIVE, EVENT_STATUSES.CLOSED]),
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
      message: "Budget must be greater than 0",
      path: ["eventBudget"],
    }
  );

export const eventUpdateSchema = z.object({
  name: z.string().min(2, "Event name is required").optional(),
  description: descriptionSchema,
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  budgetType: z.enum([BUDGET_TYPES.PER_EVENT, BUDGET_TYPES.PER_EMPLOYEE]).optional(),
  eventBudget: z.coerce.number().min(0).optional(),
  status: z.enum([EVENT_STATUSES.ACTIVE, EVENT_STATUSES.CLOSED]).optional(),
  assignedEmployees: z.array(employeeAssignmentSchema).optional(),
});

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
