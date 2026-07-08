import { promises as fs } from "fs";
import path from "path";
import { Readable } from "stream";
import { requireAuth } from "@/lib/auth";
import { getStorageProvider, getProofsBucket, gridFsObjectId, isGridFsPath } from "@/lib/storage";
import { jsonError, handleApiError } from "@/lib/api";
import { NextResponse } from "next/server";

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

function mimeFromFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return mimeMap[ext] || "application/octet-stream";
}

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

    if (isGridFsPath(storedPath)) {
      const bucket = await getProofsBucket();
      const fileId = gridFsObjectId(storedPath);
      const files = await bucket.find({ _id: fileId }).toArray();
      if (!files.length) {
        return jsonError("File not found", 404);
      }

      const meta = files[0];
      const metadata = meta.metadata as { originalName?: string; mimeType?: string } | undefined;
      const downloadName = metadata?.originalName || meta.filename;
      const contentType = metadata?.mimeType || mimeFromFilename(meta.filename);

      const downloadStream = bucket.openDownloadStream(fileId);
      const webStream = Readable.toWeb(downloadStream) as ReadableStream;

      return new NextResponse(webStream, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${downloadName}"`,
        },
      });
    }

    const storage = getStorageProvider();
    const absolutePath = storage.getAbsolutePath(storedPath);

    const uploadDir = process.env.UPLOAD_DIR || "uploads";
    const uploadsRoot = path.isAbsolute(uploadDir)
      ? uploadDir
      : path.join(process.cwd(), uploadDir);
    if (!absolutePath.startsWith(uploadsRoot)) {
      return jsonError("Forbidden", 403);
    }

    const buffer = await fs.readFile(absolutePath);
    const ext = path.extname(storedPath).toLowerCase();

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
