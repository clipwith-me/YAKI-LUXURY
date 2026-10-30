import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DomainError } from "@/server/errors";

/**
 * File storage abstraction. `local` is for development only; production should add an S3-compatible
 * driver (AWS S3, Cloudflare R2, DigitalOcean Spaces) behind the same interface with private buckets
 * and short-lived signed URLs for private documents.
 */
export interface StorageDriver {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
}

class LocalStorage implements StorageDriver {
  constructor(private readonly root: string) {}
  private resolve(key: string) {
    const full = path.resolve(this.root, key);
    if (!full.startsWith(path.resolve(this.root) + path.sep)) throw new Error("Invalid storage key");
    return full;
  }
  async put(key: string, data: Buffer) {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data, { mode: 0o600 });
  }
  async get(key: string) {
    return readFile(this.resolve(key));
  }
}

export function storage(): StorageDriver {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver === "local") return new LocalStorage(path.resolve(process.env.STORAGE_LOCAL_DIR ?? "./storage"));
  throw new Error(`Storage driver "${driver}" is not implemented`);
}

// Allowed types are decided by magic bytes, not by the client-supplied MIME type or extension.
const SIGNATURES: Array<{ mime: string; ext: string; test: (b: Buffer) => boolean }> = [
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/webp", ext: "webp", test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
  { mime: "application/pdf", ext: "pdf", test: (b) => b.subarray(0, 5).toString("ascii") === "%PDF-" },
];

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const DOCUMENT_TYPES = [...IMAGE_TYPES, "application/pdf"];

export type StoredFile = { key: string; mimeType: string; sizeBytes: number; sha256: string };

export async function storeUpload(file: File, opts: { prefix: "public" | "private"; allowed: string[]; maxBytes: number }): Promise<StoredFile> {
  if (file.size === 0) throw new DomainError("VALIDATION", "The file is empty.");
  if (file.size > opts.maxBytes) throw new DomainError("VALIDATION", `Files must be under ${Math.round(opts.maxBytes / 1024 / 1024)}MB.`);
  const buf = Buffer.from(await file.arrayBuffer());
  const sig = SIGNATURES.find((s) => s.test(buf));
  if (!sig || !opts.allowed.includes(sig.mime)) throw new DomainError("VALIDATION", "That file type isn't allowed. Use JPG, PNG, WebP or PDF.");
  // Random key: never derived from the user's file name (prevents path tricks and guessing).
  const key = `${opts.prefix}/${new Date().toISOString().slice(0, 7)}/${randomBytes(16).toString("hex")}.${sig.ext}`;
  await storage().put(key, buf);
  return { key, mimeType: sig.mime, sizeBytes: buf.length, sha256: createHash("sha256").update(buf).digest("hex") };
}
