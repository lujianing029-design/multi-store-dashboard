"use client";

import { ArrowDownUp } from "lucide-react";
import { useState } from "react";
import type { ShopPerformance } from "@/lib/dashboard/types";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/dashboard/format";

type SortKey = "gmv" | "netSales" | "paidOrders" | "refundRate" | "change";
export function ShopTable({ rows }: { rows: ShopPerformance[] }) {
  const [sort, setSort] = useState<SortKey>("gmv");
  const sorted = [...rows].sort((a, b) => b[sort] - a[sort]);
  const head = (label: string, key: SortKey) => <button className="sort-button" onClick={() => setSort(key)} type="button">{label}<ArrowDownUp size={12} /></button>;
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>店铺</th><th>平台</th><th className="numeric">{head("支付销售额", "gmv")}</th><th className="numeric">{head("净销售额", "netSales")}</th><th className="numeric">{head("订单", "paidOrders")}</th><th className="numeric">销售件数</th><th className="numeric">客单价</th><th className="numeric">{head("退款率", "refundRate")}</th><th className="numeric">{head("环比", "change")}</th></tr></thead><tbody>{sorted.map((shop) => <tr key={shop.id}><td><strong>{shop.name}</strong></td><td><span className="badge">{shop.platform}</span></td><td className="numeric">{formatCurrency(shop.gmv)}</td><td className="numeric">{formatCurrency(shop.netSales)}</td><td className="numeric">{formatNumber(shop.paidOrders)}</td><td className="numeric">{formatNumber(shop.unitsSold)}</td><td className="numeric">{formatCurrency(shop.aov)}</td><td className="numeric">{formatPercent(shop.refundRate)}</td><td className={`numeric ${shop.change >= 0 ? "change-up" : "change-down"}`}>{formatPercent(shop.change)}</td></tr>)}</tbody></table></div>;
}

