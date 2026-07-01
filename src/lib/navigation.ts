import { APP_MODULES, type AppModuleKey } from "@/lib/modules";
import { ROLES } from "@/lib/constants";

export interface NavItem {
  label: string;
  href: string;
  moduleKey: AppModuleKey;
  icon: string;
  description: string;
  section?: "quick" | "modules";
}

export const NAV_ITEMS: NavItem[] = [
  { label: APP_MODULES.dashboard.label, href: APP_MODULES.dashboard.href, moduleKey: "dashboard", icon: "dashboard", description: "Overview and quick access", section: "quick" },
  { label: APP_MODULES.users.label, href: APP_MODULES.users.href, moduleKey: "users", icon: "users", description: "Manage user accounts", section: "modules" },
  { label: APP_MODULES.categories.label, href: APP_MODULES.categories.href, moduleKey: "categories", icon: "categories", description: "Claim category settings", section: "modules" },
  { label: APP_MODULES.roles.label, href: APP_MODULES.roles.href, moduleKey: "roles", icon: "users", description: "Role and module access", section: "modules" },
  { label: APP_MODULES.events.label, href: APP_MODULES.events.href, moduleKey: "events", icon: "events", description: "Events and budgets", section: "quick" },
  { label: APP_MODULES.event_expenses.label, href: APP_MODULES.event_expenses.href, moduleKey: "event_expenses", icon: "events", description: "Event expense heads and sub-heads", section: "modules" },
  { label: APP_MODULES.review_claims.label, href: APP_MODULES.review_claims.href, moduleKey: "review_claims", icon: "claims", description: "Approve or reject claims", section: "quick" },
  { label: APP_MODULES.batches.label, href: APP_MODULES.batches.href, moduleKey: "batches", icon: "batches", description: "Club claims for director", section: "quick" },
  { label: APP_MODULES.disburse.label, href: APP_MODULES.disburse.href, moduleKey: "disburse", icon: "disburse", description: "Mark claims as paid", section: "modules" },
  { label: APP_MODULES.director_batches.label, href: APP_MODULES.director_batches.href, moduleKey: "director_batches", icon: "batches", description: "Review approval batches", section: "quick" },
  { label: APP_MODULES.my_claims.label, href: APP_MODULES.my_claims.href, moduleKey: "my_claims", icon: "claims", description: "Submit and track claims", section: "quick" },
  { label: APP_MODULES.profile.label, href: APP_MODULES.profile.href, moduleKey: "profile", icon: "profile", description: "Bank and UPI details", section: "modules" },
  { label: APP_MODULES.all_profiles.label, href: APP_MODULES.all_profiles.href, moduleKey: "all_profiles", icon: "profile", description: "View all user payment profiles", section: "modules" },
  { label: APP_MODULES.track_claim.label, href: APP_MODULES.track_claim.href, moduleKey: "track_claim", icon: "search", description: "Search by claim ID", section: "modules" },
  { label: APP_MODULES.reports.label, href: APP_MODULES.reports.href, moduleKey: "reports", icon: "reports", description: "Export and analytics", section: "modules" },
  { label: APP_MODULES.notifications.label, href: APP_MODULES.notifications.href, moduleKey: "notifications", icon: "notifications", description: "Alerts and updates", section: "quick" },
];

export function getNavForPermissions(permissions: string[]) {
  const allowed = new Set(permissions);
  return NAV_ITEMS.filter((item) => {
    if (!allowed.has(item.moduleKey)) return false;
    if (item.moduleKey === "profile" && allowed.has("all_profiles")) return false;
    return true;
  });
}

const ALL_KEYS = NAV_ITEMS.map((i) => i.moduleKey);

/** @deprecated use getNavForPermissions */
export function getNavForRole(roleSlug: string) {
  const priority: Record<string, AppModuleKey[]> = {
    [ROLES.SYSTEM_ADMIN]: ALL_KEYS,
    [ROLES.FINANCE]: ["dashboard", "users", "events", "review_claims", "batches", "disburse", "reports", "track_claim", "notifications"],
    [ROLES.DIRECTOR]: ["dashboard", "users", "director_batches", "reports", "track_claim", "notifications"],
    [ROLES.EMPLOYEE]: ["dashboard", "my_claims", "profile", "track_claim", "notifications"],
  };
  const keys = priority[roleSlug] || [];
  return NAV_ITEMS.filter((item) => keys.includes(item.moduleKey));
}

export function getBottomNavForPermissions(permissions: string[], roleSlug: string) {
  const nav = getNavForPermissions(permissions);
  const dashboard = NAV_ITEMS.find((i) => i.moduleKey === "dashboard")!;
  const items = nav.filter((item) => item.moduleKey !== "dashboard");

  const priority: Record<string, string[]> = {
    [ROLES.SYSTEM_ADMIN]: ["/admin/users", "/reports", "/notifications"],
    [ROLES.FINANCE]: ["/finance/claims", "/finance/batches", "/notifications"],
    [ROLES.DIRECTOR]: ["/director/batches", "/reports", "/notifications"],
    [ROLES.EMPLOYEE]: ["/employee/claims", "/search", "/notifications"],
  };

  const picks = (priority[roleSlug] || [])
    .map((href) => items.find((i) => i.href === href))
    .filter((item): item is NavItem => !!item);

  if (picks.length < 3) {
    for (const item of items) {
      if (picks.length >= 3) break;
      if (!picks.find((p) => p.href === item.href)) picks.push(item);
    }
  }

  return [dashboard, ...picks.slice(0, 3)];
}

/** @deprecated */
export function getBottomNavForRole(roleSlug: string) {
  return getBottomNavForPermissions([], roleSlug);
}
