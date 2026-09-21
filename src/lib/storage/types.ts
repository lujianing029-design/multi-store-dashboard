export interface StoredObject {
  key: string;
  contentType: string;
  size: number;
}

export interface PutObjectInput {
  data: Uint8Array;
  contentType: string;
  fileName: string;
}

export interface StorageAdapter {
  put(input: PutObjectInput): Promise<StoredObject>;
  read(key: string): Promise<Uint8Array | null>;
  remove(key: string): Promise<void>;
}
