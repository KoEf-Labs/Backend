import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Storage Provider Interface (swap with MinIO/S3/Hetzner later)
// ---------------------------------------------------------------------------

export interface StorageProvider {
  save(userId: string, filename: string, buffer: Buffer): Promise<string>;
  delete(filePath: string): Promise<void>;
  getPublicUrl(filePath: string): string;
}

// ---------------------------------------------------------------------------
// Local Disk Storage (development + single server)
// ---------------------------------------------------------------------------

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

export class LocalStorageProvider implements StorageProvider {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.BASE_URL || "http://localhost:3000";
  }

  async save(userId: string, filename: string, buffer: Buffer): Promise<string> {
    const userDir = path.join(UPLOADS_DIR, `u-${userId.slice(0, 8)}`);
    await fs.mkdir(userDir, { recursive: true });

    const ext = path.extname(filename) || ".webp";
    const uniqueName = `img-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
    const filePath = path.join(userDir, uniqueName);

    await fs.writeFile(filePath, buffer);

    return path.relative(UPLOADS_DIR, filePath);
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(UPLOADS_DIR, filePath);
    try {
      await fs.unlink(fullPath);
    } catch {
      // File doesn't exist — ignore
    }
  }

  getPublicUrl(filePath: string): string {
    return `${this.baseUrl}/api/uploads/${filePath}`;
  }
}

// ---------------------------------------------------------------------------
// Future: MinIO / S3 / Hetzner Object Storage
// ---------------------------------------------------------------------------
//
// export class MinIOStorageProvider implements StorageProvider {
//   constructor(private client: MinIOClient, private bucket: string) {}
//   async save(userId, filename, buffer) { ... }
//   async delete(filePath) { ... }
//   getPublicUrl(filePath) { return `https://cdn.yourapp.com/${filePath}`; }
// }
