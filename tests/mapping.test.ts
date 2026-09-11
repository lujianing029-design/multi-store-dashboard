import assert from "node:assert/strict";
import test from "node:test";
import { applyManualMapping } from "../src/lib/dashboard/mapping";

test("manual mapping updates only the selected platform product", () => {
  const snapshot = { products: [{ id: "p1", name: "保温杯", code: "SPU-1" }], rows: [
    { id: "row-1", platform: "抖音", externalProductId: "dy-1", title: "杯子", merchantCode: "", status: "UNMATCHED" as const, unifiedProductId: null, unifiedProductName: null },
    { id: "row-2", platform: "快手", externalProductId: "ks-1", title: "杯子", merchantCode: "", status: "UNMATCHED" as const, unifiedProductId: null, unifiedProductName: null }
  ] };
  const result = applyManualMapping(snapshot, "row-1", "p1");
  assert.equal(result.rows[0].status, "MANUAL");
  assert.equal(result.rows[0].unifiedProductName, "保温杯");
  assert.equal(result.rows[1].status, "UNMATCHED");
});

