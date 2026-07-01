export const APP_MODULES = {
  dashboard: { key: "dashboard", label: "Dashboard", href: "/dashboard", section: "quick" as const },
  users: { key: "users", label: "Users", href: "/admin/users", section: "modules" as const },
  categories: { key: "categories", label: "Categories", href: "/admin/categories", section: "modules" as const },
  roles: { key: "roles", label: "Roles", href: "/admin/roles", section: "modules" as const },
  events: { key: "events", label: "Events", href: "/finance/events", section: "quick" as const },
  event_expenses: { key: "event_expenses", label: "Event Expenses", href: "/finance/event-expenses", section: "modules" as const },
  review_claims: { key: "review_claims", label: "Review Claims", href: "/finance/claims", section: "quick" as const },
  batches: { key: "batches", label: "Batches", href: "/finance/batches", section: "quick" as const },
  disburse: { key: "disburse", label: "Disburse", href: "/finance/disburse", section: "modules" as const },
  director_batches: { key: "director_batches", label: "Director Batches", href: "/director/batches", section: "quick" as const },
  my_claims: { key: "my_claims", label: "My Claims", href: "/employee/claims", section: "quick" as const },
  profile: { key: "profile", label: "My Profile", href: "/employee/profile", section: "modules" as const },
  all_profiles: { key: "all_profiles", label: "All Profiles", href: "/admin/profiles", section: "modules" as const },
  track_claim: { key: "track_claim", label: "Track Claim", href: "/search", section: "modules" as const },
  reports: { key: "reports", label: "Reports", href: "/reports", section: "modules" as const },
  notifications: { key: "notifications", label: "Notifications", href: "/notifications", section: "quick" as const },
} as const;

export type AppModuleKey = keyof typeof APP_MODULES;

export const ALL_MODULE_KEYS = Object.keys(APP_MODULES) as AppModuleKey[];

export function isValidModuleKey(key: string): key is AppModuleKey {
  return key in APP_MODULES;
}

export function sanitizeModules(modules: string[]): AppModuleKey[] {
  return modules.filter(isValidModuleKey);
}
