export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
  sleep?: (delayMs: number) => Promise<void>;
}

const defaultSleep = (delayMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, delayMs));

export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 100;
  const maxDelayMs = options.maxDelayMs ?? 2_000;
  const sleep = options.sleep ?? defaultSleep;

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new RangeError("maxAttempts must be a positive integer");
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      const canRetry = attempt < maxAttempts && (options.shouldRetry?.(error) ?? true);
      if (!canRetry) {
        throw error;
      }

      const delayMs = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      await sleep(delayMs);
    }
  }

  throw lastError;
}

