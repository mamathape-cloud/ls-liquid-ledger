import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

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

class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), process.env.UPLOAD_DIR || "uploads");
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
  return new LocalStorageProvider();
}
