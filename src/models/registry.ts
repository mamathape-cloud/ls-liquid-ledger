import { ApprovalBatch } from "./ApprovalBatch";
import { Category } from "./Category";
import { Claim } from "./Claim";
import { Event } from "./Event";
import { EventExpensePlan } from "./EventExpensePlan";
import { Notification } from "./Notification";
import { Role } from "./Role";
import { User } from "./User";

/**
 * Referencing every model in one place guarantees each model's
 * `mongoose.model(...)` registration side-effect runs and survives production
 * tree-shaking (Turbopack/OpenNext). Without this, a route that only imports a
 * model for a string-based `.populate("categoryId")` gets the import stripped,
 * and the query fails at runtime with `MissingSchemaError`.
 *
 * Called from `connectDB()` so all schemas are registered before any query.
 */
export function registerModels() {
  return {
    ApprovalBatch,
    Category,
    Claim,
    Event,
    EventExpensePlan,
    Notification,
    Role,
    User,
  };
}
