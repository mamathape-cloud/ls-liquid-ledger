import { promises as fs } from "fs";
import path from "path";
import { requireAuth } from "@/lib/auth";
import { getProofsBucket, gridFsObjectId, isGridFsPath } from "@/lib/storage";
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

function localUploadsRoot() {
  const uploadDir = process.env.UPLOAD_DIR || "uploads";
  return path.resolve(
    path.isAbsolute(uploadDir) ? uploadDir : path.join(process.cwd(), uploadDir)
  );
}

async function readGridFsBuffer(storedPath: string) {
  const bucket = await getProofsBucket();
  const fileId = gridFsObjectId(storedPath);
  const files = await bucket.find({ _id: fileId }).toArray();
  if (!files.length) return null;

  const meta = files[0];
  const metadata = meta.metadata as { originalName?: string; mimeType?: string } | undefined;
  const downloadName = (metadata?.originalName || meta.filename || "file").replace(/"/g, "");
  const contentType = metadata?.mimeType || mimeFromFilename(meta.filename);

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    const stream = bucket.openDownloadStream(fileId);
    stream.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    stream.on("error", reject);
    stream.on("end", () => resolve());
  });

  return {
    buffer: Buffer.concat(chunks),
    downloadName,
    contentType,
  };
}

/** Fallback: older local paths like proofs/<uuid>.ext may exist in GridFS by filename. */
async function readGridFsByFilename(filename: string) {
  try {
    const bucket = await getProofsBucket();
    const files = await bucket.find({ filename }).sort({ uploadDate: -1 }).limit(1).toArray();
    if (!files.length) return null;
    return readGridFsBuffer(`gridfs/${files[0]._id.toString()}`);
  } catch {
    return null;
  }
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
      try {
        const file = await readGridFsBuffer(storedPath);
        if (!file) {
          return jsonError("File not found", 404);
        }
        return new NextResponse(new Uint8Array(file.buffer), {
          headers: {
            "Content-Type": file.contentType,
            "Content-Disposition": `inline; filename="${file.downloadName}"`,
          },
        });
      } catch {
        return jsonError("File not found", 404);
      }
    }

    const uploadsRoot = localUploadsRoot();
    const absolutePath = path.resolve(uploadsRoot, storedPath);
    if (!absolutePath.startsWith(uploadsRoot + path.sep) && absolutePath !== uploadsRoot) {
      return jsonError("Forbidden", 403);
    }

    try {
      const buffer = await fs.readFile(absolutePath);
      const ext = path.extname(storedPath).toLowerCase();
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": mimeMap[ext] || "application/octet-stream",
          "Content-Disposition": `inline; filename="${path.basename(storedPath)}"`,
        },
      });
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code !== "ENOENT") {
        return handleApiError(err);
      }

      // Local file missing (common after Lambda /tmp wipe). Try GridFS by stored filename.
      const byName = await readGridFsByFilename(path.basename(storedPath));
      if (byName) {
        return new NextResponse(new Uint8Array(byName.buffer), {
          headers: {
            "Content-Type": byName.contentType,
            "Content-Disposition": `inline; filename="${byName.downloadName}"`,
          },
        });
      }

      return jsonError(
        "File not found. This proof was stored on temporary server disk and is no longer available. Please re-upload it by editing the claim.",
        404
      );
    }
  } catch (error) {
    return handleApiError(error);
  }
}
