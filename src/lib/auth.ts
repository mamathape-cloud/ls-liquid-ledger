import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Role } from "@/models/Role";
import type { SessionUser } from "@/types";
import { ROLES, type Role as RoleSlug } from "@/lib/constants";
import { COOKIE_NAME } from "@/lib/auth-edge";
import type { AppModuleKey } from "@/lib/modules";

const MAX_AGE = 60 * 60 * 24 * 7;

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret"
);

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function getRolePermissions(roleSlug: string): Promise<string[]> {
  await connectDB();
  const role = await Role.findOne({ slug: roleSlug.toUpperCase(), active: true }).lean();
  return role?.modules || [];
}

export async function buildSessionUser(user: {
  _id: { toString(): string };
  phone: string;
  name: string;
  roleSlug: string;
}): Promise<SessionUser> {
  const permissions = await getRolePermissions(user.roleSlug);
  return {
    id: user._id.toString(),
    phone: user.phone,
    name: user.name,
    roleSlug: user.roleSlug,
    permissions,
  };
}

export async function createToken(user: SessionUser) {
  return new SignJWT({
    sub: user.id,
    phone: user.phone,
    name: user.name,
    roleSlug: user.roleSlug,
    permissions: user.permissions,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return {
    id: payload.sub as string,
    phone: payload.phone as string,
    name: payload.name as string,
    roleSlug: (payload.roleSlug as string) || (payload.role as string),
    permissions: (payload.permissions as string[]) || [],
  } satisfies SessionUser;
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionFromRequest(req?: NextRequest) {
  let token: string | undefined;

  if (req) {
    token = req.cookies.get(COOKIE_NAME)?.value;
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get(COOKIE_NAME)?.value;
  }

  if (!token) return null;

  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

export async function requireAuth(req?: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requireRoles(roles: RoleSlug[], req?: NextRequest) {
  const session = await requireAuth(req);
  if (!roles.includes(session.roleSlug as RoleSlug)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export async function requireModule(moduleKey: AppModuleKey, req?: NextRequest) {
  const session = await requireAuth(req);
  if (!session.permissions.includes(moduleKey)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export async function requireAnyModule(
  moduleKeys: AppModuleKey[],
  req?: NextRequest
) {
  const session = await requireAuth(req);
  if (!moduleKeys.some((key) => session.permissions.includes(key))) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export async function getUserByPhone(phone: string) {
  await connectDB();
  return User.findOne({ phone });
}

export function canManageRole(actorRoleSlug: string, targetRoleSlug: string) {
  if (actorRoleSlug === ROLES.SYSTEM_ADMIN) return true;
  if (actorRoleSlug === ROLES.FINANCE) {
    return targetRoleSlug === ROLES.DIRECTOR || targetRoleSlug === ROLES.EMPLOYEE;
  }
  return false;
}

export function hasModule(session: SessionUser, moduleKey: AppModuleKey) {
  return session.permissions.includes(moduleKey);
}

export async function getUserIdsWithModule(moduleKey: AppModuleKey): Promise<string[]> {
  await connectDB();
  const roles = await Role.find({ active: true, modules: moduleKey }).select("slug").lean();
  const slugs = roles.map((r) => r.slug);
  if (!slugs.length) return [];
  const users = await User.find({ roleSlug: { $in: slugs }, status: "ACTIVE" })
    .select("_id")
    .lean();
  return users.map((u) => u._id.toString());
}

export { COOKIE_NAME };
