import { promises as fs } from "fs";
import path from "path";
import { requireAuth } from "@/lib/auth";
import { getStorageProvider } from "@/lib/storage";
import { jsonError, handleApiError } from "@/lib/api";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    await requireAuth();
    const { path: pathSegments } = await params;
    const storedPath = pathSegments.join("/");

    if (!storedPath || storedPath.includes("..")) {
      return jsonError("Invalid file path", 400);
    }

    const storage = getStorageProvider();
    const absolutePath = storage.getAbsolutePath(storedPath);

    const uploadsRoot = path.join(
      process.cwd(),
      process.env.UPLOAD_DIR || "uploads"
    );
    if (!absolutePath.startsWith(uploadsRoot)) {
      return jsonError("Forbidden", 403);
    }

    const buffer = await fs.readFile(absolutePath);
    const ext = path.extname(storedPath).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".pdf": "application/pdf",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeMap[ext] || "application/octet-stream",
        "Content-Disposition": `inline; filename="${path.basename(storedPath)}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
