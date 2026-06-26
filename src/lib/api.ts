import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400, errors?: unknown) {
  return NextResponse.json({ message, errors }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }
    if (error.message === "FORBIDDEN") {
      return jsonError("Forbidden", 403);
    }
    if (error.message === "NOT_FOUND") {
      return jsonError("Not found", 404);
    }
  }
  console.error(error);
  return jsonError("Internal server error", 500);
}
