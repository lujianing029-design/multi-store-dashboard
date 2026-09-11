import assert from "node:assert/strict";
import test from "node:test";
import { calculateMetrics, periodChange } from "../src/lib/metrics/calculator";

test("calculates money without floating-point drift and counts unique orders", () => {
  const result = calculateMetrics([
    { orderId: "order-1", amount: "0.10", units: 1 },
    { orderId: "order-1", amount: "0.20", units: 2 },
    { orderId: "order-2", amount: "99.70", units: 1 }
  ], [{ amount: "10.05" }]);
  assert.equal(result.paidGmv.toFixed(2), "100.00");
  assert.equal(result.netSales.toFixed(2), "89.95");
  assert.equal(result.paidOrders, 2);
  assert.equal(result.unitsSold, 4);
  assert.equal(result.refundRate.toFixed(4), "0.1005");
  assert.equal(result.aov.toFixed(2), "50.00");
});

test("period change handles growth, decline, and a zero baseline", () => {
  assert.equal(periodChange("125", "100")?.toFixed(2), "0.25");
  assert.equal(periodChange("75", "100")?.toFixed(2), "-0.25");
  assert.equal(periodChange("10", "0"), null);
});

