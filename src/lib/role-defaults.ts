import { ROLES } from "@/lib/constants";
import { ALL_MODULE_KEYS, type AppModuleKey } from "@/lib/modules";

export interface DefaultRoleSeed {
  name: string;
  slug: string;
  modules: AppModuleKey[];
  isSystem: boolean;
}

export const DEFAULT_ROLES: DefaultRoleSeed[] = [
  {
    name: "System Admin",
    slug: ROLES.SYSTEM_ADMIN,
    modules: [...ALL_MODULE_KEYS],
    isSystem: true,
  },
  {
    name: "Finance",
    slug: ROLES.FINANCE,
    modules: [
      "dashboard",
      "users",
      "events",
      "review_claims",
      "batches",
      "disburse",
      "reports",
      "track_claim",
      "notifications",
    ],
    isSystem: true,
  },
  {
    name: "Director",
    slug: ROLES.DIRECTOR,
    modules: [
      "dashboard",
      "users",
      "director_batches",
      "reports",
      "track_claim",
      "notifications",
    ],
    isSystem: true,
  },
  {
    name: "Employee",
    slug: ROLES.EMPLOYEE,
    modules: [
      "dashboard",
      "my_claims",
      "profile",
      "track_claim",
      "notifications",
    ],
    isSystem: true,
  },
];
