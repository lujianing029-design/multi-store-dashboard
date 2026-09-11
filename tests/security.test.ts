import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeError, sanitizeRawPayload, SyncError } from "../src/platforms/security";

test("sanitizeRawPayload removes sensitive keys recursively", () => {
  const sanitized = sanitizeRawPayload({
    orderId: "safe",
    access_token: "hidden",
    nested: {
      cookie: "hidden",
      value: 42,
      rows: [{ appSecret: "hidden", status: "ok" }]
    }
  });

  assert.deepEqual(sanitized, {
    orderId: "safe",
    nested: { value: 42, rows: [{ status: "ok" }] }
  });
});

test("sanitizeError preserves safe error codes and redacts credential values", () => {
  const sanitized = sanitizeError(
    new SyncError("ADAPTER_FAILED", "request failed token=abc123 cookie=session-value")
  );

  assert.equal(sanitized.code, "ADAPTER_FAILED");
  assert.equal(sanitized.message.includes("abc123"), false);
  assert.equal(sanitized.message.includes("session-value"), false);
});

