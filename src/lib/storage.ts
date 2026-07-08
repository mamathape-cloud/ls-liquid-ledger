import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { Readable } from "stream";
import { GridFSBucket, ObjectId } from "mongodb";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";

export interface StoredFile {
  originalName: string;
  storedPath: string;
  mimeType: string;
  size: number;
}

export interface StorageProvider {
  save(file: File, folder?: string): Promise<StoredFile>;
  getAbsolutePath(storedPath: string): string;
  delete(storedPath: string): Promise<void>;
}

const GRIDFS_BUCKET = "proofs";
const GRIDFS_PREFIX = "gridfs/";

export function isGridFsPath(storedPath: string): boolean {
  return storedPath.startsWith(GRIDFS_PREFIX);
}

export function gridFsObjectId(storedPath: string): ObjectId {
  return new ObjectId(storedPath.slice(GRIDFS_PREFIX.length));
}

export async function getProofsBucket(): Promise<GridFSBucket> {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database not connected");
  }
  return new GridFSBucket(db, { bucketName: GRIDFS_BUCKET });
}

class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor() {
    // Honor an absolute UPLOAD_DIR (e.g. /tmp/uploads on Lambda, whose working
    // dir /var/task is read-only). Relative values stay under the project cwd.
    const uploadDir = process.env.UPLOAD_DIR || "uploads";
    this.baseDir = path.isAbsolute(uploadDir)
      ? uploadDir
      : path.join(process.cwd(), uploadDir);
  }

  private async ensureDir(dir: string) {
    await fs.mkdir(dir, { recursive: true });
  }

  async save(file: File, folder = "proofs"): Promise<StoredFile> {
    const ext = path.extname(file.name) || "";
    const storedName = `${randomUUID()}${ext}`;
    const relativePath = path.join(folder, storedName);
    const absolutePath = path.join(this.baseDir, relativePath);

    await this.ensureDir(path.dirname(absolutePath));
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(absolutePath, buffer);

    return {
      originalName: file.name,
      storedPath: relativePath.replace(/\\/g, "/"),
      mimeType: file.type,
      size: file.size,
    };
  }

  getAbsolutePath(storedPath: string) {
    return path.join(this.baseDir, storedPath);
  }

  async delete(storedPath: string) {
    try {
      await fs.unlink(this.getAbsolutePath(storedPath));
    } catch {
      // ignore missing files
    }
  }
}

class GridFSStorageProvider implements StorageProvider {
  async save(file: File, _folder?: string): Promise<StoredFile> {
    const bucket = await getProofsBucket();
    const ext = path.extname(file.name) || "";
    const storedName = `${randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const fileId = await new Promise<ObjectId>((resolve, reject) => {
      const uploadStream = bucket.openUploadStream(storedName, {
        metadata: { originalName: file.name, mimeType: file.type },
      });
      uploadStream.on("error", reject);
      uploadStream.on("finish", () => resolve(uploadStream.id as ObjectId));
      Readable.from(buffer).pipe(uploadStream);
    });

    return {
      originalName: file.name,
      storedPath: `${GRIDFS_PREFIX}${fileId.toString()}`,
      mimeType: file.type,
      size: file.size,
    };
  }

  getAbsolutePath(): string {
    throw new Error("GridFS storage does not use local absolute paths");
  }

  async delete(storedPath: string) {
    if (!isGridFsPath(storedPath)) return;
    try {
      const bucket = await getProofsBucket();
      await bucket.delete(gridFsObjectId(storedPath));
    } catch {
      // ignore missing files
    }
  }
}

class S3StorageProvider implements StorageProvider {
  async save(): Promise<StoredFile> {
    throw new Error(
      "S3 storage is not configured. Set AWS credentials and STORAGE_PROVIDER=s3 before production."
    );
  }

  getAbsolutePath(): string {
    throw new Error("S3 storage does not use local absolute paths");
  }

  async delete(): Promise<void> {
    throw new Error("S3 storage is not configured");
  }
}

export function getStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER || "local";
  if (provider === "s3") {
    return new S3StorageProvider();
  }
  if (provider === "gridfs" || process.env.VERCEL === "1") {
    return new GridFSStorageProvider();
  }
  return new LocalStorageProvider();
}
