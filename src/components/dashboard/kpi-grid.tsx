import type { KpiValue } from "@/lib/dashboard/types";
import { formatChange, formatCurrency, formatNumber, formatPercent } from "@/lib/dashboard/format";

function display(kpi: KpiValue) {
  if (kpi.label === "退款率") return formatPercent(Number(kpi.value));
  if (["支付订单", "销售件数"].includes(kpi.label)) return formatNumber(kpi.value);
  return formatCurrency(kpi.value);
}

export function KpiGrid({ items }: { items: KpiValue[] }) {
  return <section className="kpi-grid" aria-label="核心指标">{items.map((item) => {
    const tone = item.change === null ? "neutral" : item.change < 0 ? "negative" : "";
    return <div className={`kpi ${item.tone === "warning" ? "warning" : ""}`} key={item.label}><div className="kpi-label">{item.label}</div><div className="kpi-value" title={display(item)}>{display(item)}</div><div className={`kpi-change ${tone}`}>环比 {formatChange(item.change)}</div></div>;
  })}</section>;
}

