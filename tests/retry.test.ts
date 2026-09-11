import assert from "node:assert/strict";
import test from "node:test";
import { withRetry } from "../src/platforms/retry";

test("withRetry uses bounded exponential backoff and returns the successful value", async () => {
  const delays: number[] = [];
  let attempts = 0;
  const result = await withRetry(
    async () => {
      attempts += 1;
      if (attempts < 3) throw new Error("temporary");
      return "ok";
    },
    {
      maxAttempts: 4,
      baseDelayMs: 5,
      maxDelayMs: 8,
      sleep: async (delay) => {
        delays.push(delay);
      }
    }
  );

  assert.equal(result, "ok");
  assert.equal(attempts, 3);
  assert.deepEqual(delays, [5, 8]);
});

test("withRetry does not exceed maxAttempts", async () => {
  let attempts = 0;
  await assert.rejects(
    withRetry(
      async () => {
        attempts += 1;
        throw new Error("still failing");
      },
      { maxAttempts: 2, sleep: async () => undefined }
    ),
    /still failing/
  );
  assert.equal(attempts, 2);
});

