const sensitiveKey =
  /(^|_)(authorization|cookie|password|access_?token|refresh_?token|app_?key|app_?secret|secret)($|_)/i;

export type SafeJson =
  | string
  | number
  | boolean
  | null
  | SafeJson[]
  | { [key: string]: SafeJson };

export function sanitizeRawPayload(value: unknown): SafeJson {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : String(value);
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeRawPayload);
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key, entry]) => !sensitiveKey.test(key) && entry !== undefined)
        .map(([key, entry]) => [key, sanitizeRawPayload(entry)])
    );
  }

  return String(value);
}

export function sanitizeError(error: unknown): {
  code: string;
  message: string;
} {
  const source = error instanceof Error ? error.message : String(error);
  const message = source
    .replace(/(postgres(?:ql)?:\/\/[^:\s]+:)[^@\s]+@/gi, "$1[REDACTED]@")
    .replace(/(bearer\s+)[A-Za-z0-9._~+\/-]+/gi, "$1[REDACTED]")
    .replace(/(authorization|cookie|password|token|secret|app[_-]?key)\s*[:=]\s*\S+/gi, "$1=[REDACTED]")
    .slice(0, 1000);

  return {
    code: error instanceof SyncError ? error.code : "SYNC_FAILED",
    message
  };
}

export class SyncError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "SyncError";
  }
}

