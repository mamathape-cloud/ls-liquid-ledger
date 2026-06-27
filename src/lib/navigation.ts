import { ROLES, type Role } from "@/lib/constants";

export interface NavItem {
  label: string;
  href: string;
  roles: Role[];
  icon: string;
  description: string;
  section?: "quick" | "modules";
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", roles: Object.values(ROLES), icon: "dashboard", description: "Overview and quick access", section: "quick" },
  { label: "Users", href: "/admin/users", roles: [ROLES.SYSTEM_ADMIN, ROLES.FINANCE], icon: "users", description: "Manage user accounts", section: "modules" },
  { label: "Categories", href: "/admin/categories", roles: [ROLES.SYSTEM_ADMIN], icon: "categories", description: "Claim category settings", section: "modules" },
  { label: "Events", href: "/finance/events", roles: [ROLES.FINANCE], icon: "events", description: "Events and budgets", section: "quick" },
  { label: "Review Claims", href: "/finance/claims", roles: [ROLES.FINANCE], icon: "claims", description: "Approve or reject claims", section: "quick" },
  { label: "Batches", href: "/finance/batches", roles: [ROLES.FINANCE], icon: "batches", description: "Club claims for director", section: "quick" },
  { label: "Disburse", href: "/finance/disburse", roles: [ROLES.FINANCE], icon: "disburse", description: "Mark claims as paid", section: "modules" },
  { label: "Batches", href: "/director/batches", roles: [ROLES.DIRECTOR], icon: "batches", description: "Review approval batches", section: "quick" },
  { label: "My Claims", href: "/employee/claims", roles: [ROLES.EMPLOYEE], icon: "claims", description: "Submit and track claims", section: "quick" },
  { label: "My Profile", href: "/employee/profile", roles: [ROLES.EMPLOYEE], icon: "profile", description: "Bank and UPI details", section: "modules" },
  { label: "Track Claim", href: "/search", roles: Object.values(ROLES), icon: "search", description: "Search by claim ID", section: "modules" },
  { label: "Reports", href: "/reports", roles: [ROLES.FINANCE, ROLES.DIRECTOR, ROLES.SYSTEM_ADMIN], icon: "reports", description: "Export and analytics", section: "modules" },
  { label: "Notifications", href: "/notifications", roles: Object.values(ROLES), icon: "notifications", description: "Alerts and updates", section: "quick" },
];

export function getNavForRole(role: Role) {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function getBottomNavForRole(role: Role): NavItem[] {
  const dashboard = NAV_ITEMS.find((i) => i.href === "/dashboard")!;
  const items = getNavForRole(role).filter((item) => item.href !== "/dashboard");

  const priority: Record<Role, string[]> = {
    [ROLES.SYSTEM_ADMIN]: ["/admin/users", "/reports", "/notifications"],
    [ROLES.FINANCE]: ["/finance/claims", "/finance/batches", "/notifications"],
    [ROLES.DIRECTOR]: ["/director/batches", "/reports", "/notifications"],
    [ROLES.EMPLOYEE]: ["/employee/claims", "/search", "/notifications"],
  };

  const picks = priority[role]
    .map((href) => items.find((i) => i.href === href))
    .filter((item): item is NavItem => !!item);

  return [dashboard, ...picks.slice(0, 3)];
}
