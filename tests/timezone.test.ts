import assert from "node:assert/strict";
import test from "node:test";
import { getUtcRangeForLocalDate, getZonedRange, parsePreset } from "../src/lib/metrics/timezone";

test("uses Asia/Shanghai local-day boundaries by default", () => {
  const range = getUtcRangeForLocalDate("2026-06-18");
  assert.equal(range.start.toISOString(), "2026-06-17T16:00:00.000Z");
  assert.equal(range.end.toISOString(), "2026-06-18T16:00:00.000Z");
});

test("accounts for daylight-saving days in the shop timezone", () => {
  const spring = getUtcRangeForLocalDate("2026-03-08", "America/New_York");
  assert.equal((spring.end.getTime() - spring.start.getTime()) / 3_600_000, 23);
});

test("defaults invalid presets to seven days", () => {
  assert.equal(parsePreset("unknown"), "7d");
  const range = getZonedRange("7d", new Date("2026-06-18T12:00:00Z"));
  assert.equal(range.startDate, "2026-06-12");
  assert.equal(range.endDate, "2026-06-18");
});

