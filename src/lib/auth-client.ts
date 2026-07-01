import { ROLES } from "@/lib/constants";

export function canManageRole(actorRoleSlug: string, targetRoleSlug: string) {
  if (actorRoleSlug === ROLES.SYSTEM_ADMIN) return true;
  if (actorRoleSlug === ROLES.FINANCE) {
    return targetRoleSlug === ROLES.DIRECTOR || targetRoleSlug === ROLES.EMPLOYEE;
  }
  return false;
}
