import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { PutObjectInput, StorageAdapter, StoredObject } from "@/lib/storage/types";

const safeExtension = (fileName: string) => {
  const extension = path.extname(fileName).toLowerCase();
  return /^\.[a-z0-9]{1,10}$/.test(extension) ? extension : "";
};

/**
 * Development-only object storage. The storage key is opaque; callers never
 * receive or compose an operating-system path, so this adapter can be swapped
 * for S3, R2, OSS or COS without changing application code.
 */
export class LocalStorageAdapter implements StorageAdapter {
  constructor(private readonly root = process.env.LOCAL_STORAGE_ROOT ?? path.join(process.cwd(), ".local-storage")) {}

  async put(input: PutObjectInput): Promise<StoredObject> {
    const key = `${randomUUID()}${safeExtension(input.fileName)}`;
    await mkdir(this.root, { recursive: true });
    await writeFile(this.resolve(key), input.data);
    return { key, contentType: input.contentType, size: input.data.byteLength };
  }

  async read(key: string): Promise<Uint8Array | null> {
    try {
      return await readFile(this.resolve(key));
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") return null;
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }

  private resolve(key: string) {
    if (!/^[a-f0-9-]{36}(\.[a-z0-9]{1,10})?$/i.test(key)) throw new Error("Invalid storage key");
    return path.join(this.root, key);
  }
}
