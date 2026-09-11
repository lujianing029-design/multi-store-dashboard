import type { MappingSnapshot } from "@/lib/dashboard/types";

export function applyManualMapping(snapshot: MappingSnapshot, platformProductId: string, unifiedProductId: string): MappingSnapshot {
  const product = snapshot.products.find((item) => item.id === unifiedProductId);
  if (!product) throw new RangeError("Unified product does not exist");
  return { ...snapshot, rows: snapshot.rows.map((row) => row.id === platformProductId ? { ...row, status: "MANUAL", unifiedProductId, unifiedProductName: product.name } : row) };
}

