import sharp from "sharp";
import { StorageProvider, LocalStorageProvider } from "./storage";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DIMENSION = 4096; // px
const OUTPUT_WIDTH = 1920;
const OUTPUT_QUALITY = 80;

// Allowed MIME types + their magic bytes
const ALLOWED_TYPES: Record<string, { mimes: string[]; magicBytes: number[][] }> = {
  jpeg: {
    mimes: ["image/jpeg", "image/jpg"],
    magicBytes: [[0xff, 0xd8, 0xff]],
  },
  png: {
    mimes: ["image/png"],
    magicBytes: [[0x89, 0x50, 0x4e, 0x47]],
  },
  webp: {
    mimes: ["image/webp"],
    magicBytes: [[0x52, 0x49, 0x46, 0x46]], // RIFF
  },
  gif: {
    mimes: ["image/gif"],
    magicBytes: [
      [0x47, 0x49, 0x46, 0x38, 0x37], // GIF87a
      [0x47, 0x49, 0x46, 0x38, 0x39], // GIF89a
    ],
  },
};

const ALL_ALLOWED_MIMES = Object.values(ALLOWED_TYPES).flatMap((t) => t.mimes);

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class UploadService {
  private storage: StorageProvider;

  constructor(storage?: StorageProvider) {
    this.storage = storage ?? new LocalStorageProvider();
  }

  /**
   * Process and store an uploaded image.
   * 1. Validate MIME type
   * 2. Validate magic bytes (file header)
   * 3. Validate file size
   * 4. Re-encode with sharp (strips metadata, neutralizes payloads)
   * 5. Resize if too large
   * 6. Save to storage
   */
  async processUpload(
    userId: string,
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<{ url: string; size: number; width: number; height: number }> {
    // 1. MIME type check
    if (!ALL_ALLOWED_MIMES.includes(mimeType)) {
      throw new UploadError(
        `Unsupported file type: ${mimeType}. Allowed: JPEG, PNG, WebP, GIF`,
        400
      );
    }

    // 2. Magic bytes check (don't trust MIME alone)
    if (!this.verifyMagicBytes(fileBuffer)) {
      throw new UploadError("File content does not match its type", 400);
    }

    // 3. Size check
    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new UploadError(
        `File too large (${(fileBuffer.length / 1024 / 1024).toFixed(1)}MB). Max: 5MB`,
        400
      );
    }

    // 4. Get image metadata
    const metadata = await sharp(fileBuffer).metadata();
    if (!metadata.width || !metadata.height) {
      throw new UploadError("Could not read image dimensions", 400);
    }

    if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
      throw new UploadError(
        `Image too large (${metadata.width}x${metadata.height}). Max: ${MAX_DIMENSION}x${MAX_DIMENSION}`,
        400
      );
    }

    // 5. Re-encode with sharp → WebP output
    //    This strips EXIF/metadata and neutralizes any embedded payloads
    let processed = sharp(fileBuffer).rotate(); // auto-rotate based on EXIF

    if (metadata.width! > OUTPUT_WIDTH) {
      processed = processed.resize(OUTPUT_WIDTH, null, { withoutEnlargement: true });
    }

    const outputBuffer = await processed
      .webp({ quality: OUTPUT_QUALITY })
      .toBuffer();

    const outputMeta = await sharp(outputBuffer).metadata();

    // 6. Save to storage
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
    const storagePath = await this.storage.save(
      userId,
      safeName.replace(/\.[^.]+$/, ".webp"),
      outputBuffer
    );

    return {
      url: this.storage.getPublicUrl(storagePath),
      size: outputBuffer.length,
      width: outputMeta.width || 0,
      height: outputMeta.height || 0,
    };
  }

  private verifyMagicBytes(buffer: Buffer): boolean {
    for (const type of Object.values(ALLOWED_TYPES)) {
      for (const magic of type.magicBytes) {
        if (buffer.length >= magic.length) {
          const match = magic.every((byte, i) => buffer[i] === byte);
          if (match) return true;
        }
      }
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class UploadError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "UploadError";
    this.status = status;
  }
}
