import { jwtVerify } from "jose";

export const COOKIE_NAME = "ll_session";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret"
);

export async function verifyTokenEdge(token: string) {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return payload;
}
