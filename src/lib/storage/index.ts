import { LocalStorageAdapter } from "@/lib/storage/local-storage-adapter";
import type { StorageAdapter } from "@/lib/storage/types";

let storage: StorageAdapter | undefined;

export function getStorageAdapter(): StorageAdapter {
  // Keep selection in one composition root. Future S3/R2/OSS/COS adapters
  // implement StorageAdapter here; routes and domain services stay unchanged.
  storage ??= new LocalStorageAdapter();
  return storage;
}

export type { PutObjectInput, StorageAdapter, StoredObject } from "@/lib/storage/types";
