import assert from "node:assert/strict";
import test from "node:test";
import { fenToDecimalString } from "../src/platforms/money";

test("normalizes integer platform amounts in fen to fixed-point yuan", () => {
  assert.equal(fenToDecimalString(0), "0.00");
  assert.equal(fenToDecimalString(1), "0.01");
  assert.equal(fenToDecimalString(12900), "129.00");
  assert.equal(fenToDecimalString(25800), "258.00");
});

test("rejects lossy, fractional, and negative platform amounts", () => {
  assert.throws(() => fenToDecimalString(10.5), RangeError);
  assert.throws(() => fenToDecimalString(-1), RangeError);
  assert.throws(() => fenToDecimalString(Number.MAX_SAFE_INTEGER + 1), RangeError);
});

