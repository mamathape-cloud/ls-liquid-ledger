import { ROLES, type Role } from "@/lib/constants";

export interface NavItem {
  label: string;
  href: string;
  roles: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", roles: Object.values(ROLES) },
  { label: "Users", href: "/admin/users", roles: [ROLES.SYSTEM_ADMIN, ROLES.FINANCE] },
  { label: "Categories", href: "/admin/categories", roles: [ROLES.SYSTEM_ADMIN] },
  { label: "Events", href: "/finance/events", roles: [ROLES.FINANCE] },
  { label: "Review Claims", href: "/finance/claims", roles: [ROLES.FINANCE] },
  { label: "Batches", href: "/finance/batches", roles: [ROLES.FINANCE] },
  { label: "Disburse", href: "/finance/disburse", roles: [ROLES.FINANCE] },
  { label: "Batches", href: "/director/batches", roles: [ROLES.DIRECTOR] },
  { label: "My Claims", href: "/employee/claims", roles: [ROLES.EMPLOYEE] },
  { label: "My Profile", href: "/employee/profile", roles: [ROLES.EMPLOYEE] },
  { label: "Track Claim", href: "/search", roles: Object.values(ROLES) },
  { label: "Reports", href: "/reports", roles: [ROLES.FINANCE, ROLES.DIRECTOR, ROLES.SYSTEM_ADMIN] },
  { label: "Notifications", href: "/notifications", roles: Object.values(ROLES) },
];

export function getNavForRole(role: Role) {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
