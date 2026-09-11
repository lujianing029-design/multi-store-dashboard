"use client";

import { ArrowDownUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { ProductPerformance } from "@/lib/dashboard/types";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/dashboard/format";
import type { DatePreset } from "@/lib/metrics/timezone";

type SortKey = "unitsSold" | "gmv" | "netSales" | "refundRate" | "trend7d" | "trend30d";
export function ProductTable({ rows, preset }: { rows: ProductPerformance[]; preset: DatePreset }) {
  const [sort, setSort] = useState<SortKey>("gmv");
  const sorted = [...rows].sort((a, b) => b[sort] - a[sort]);
  const head = (label: string, key: SortKey) => <button className="sort-button" onClick={() => setSort(key)} type="button">{label}<ArrowDownUp size={12} /></button>;
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>商品</th><th>主力平台</th><th className="numeric">{head("销售件数", "unitsSold")}</th><th className="numeric">{head("支付销售额", "gmv")}</th><th className="numeric">{head("净销售额", "netSales")}</th><th className="numeric">{head("退款率", "refundRate")}</th><th className="numeric">{head("近 7 天", "trend7d")}</th><th className="numeric">{head("近 30 天", "trend30d")}</th></tr></thead><tbody>{sorted.map((product) => <tr key={product.id}><td><Link className="product-name text-link" href={`/products/${product.id}?range=${preset}`}><strong>{product.name}</strong><span>{product.code}</span></Link></td><td><span className="badge">{product.leadingPlatform} · {formatPercent(product.platformShare)}</span></td><td className="numeric">{formatNumber(product.unitsSold)}</td><td className="numeric">{formatCurrency(product.gmv)}</td><td className="numeric">{formatCurrency(product.netSales)}</td><td className="numeric">{formatPercent(product.refundRate)}</td><td className={`numeric ${product.trend7d >= 0 ? "change-up" : "change-down"}`}>{formatPercent(product.trend7d)}</td><td className={`numeric ${product.trend30d >= 0 ? "change-up" : "change-down"}`}>{formatPercent(product.trend30d)}</td></tr>)}</tbody></table></div>;
}

