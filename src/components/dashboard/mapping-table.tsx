"use client";

import { Link2, PackageOpen } from "lucide-react";
import { useMemo, useState } from "react";
import type { MappingSnapshot } from "@/lib/dashboard/types";
import { applyManualMapping } from "@/lib/dashboard/mapping";

export function MappingTable({ initial }: { initial: MappingSnapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [filter, setFilter] = useState("ALL");
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const rows = useMemo(() => filter === "ALL" ? snapshot.rows : snapshot.rows.filter((row) => row.status === filter), [filter, snapshot]);
  async function link(rowId: string) {
    const productId = selection[rowId];
    if (!productId) return;
    setMessage("正在保存…");
    const response = await fetch("/api/mapping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platformProductId: rowId, unifiedProductId: productId }) });
    if (!response.ok) { setMessage("保存失败，请重试"); return; }
    setSnapshot((current) => applyManualMapping(current, rowId, productId));
    setMessage("映射已保存，后续同步会保留该关联");
  }
  return <section className="panel table-panel">
    <div className="table-head"><div><h2>平台商品列表</h2><span className="status-note">手工关联优先于自动匹配</span></div><div className="toolbar">{message ? <span className="toast">{message}</span> : null}<select aria-label="映射状态" className="filter-select" onChange={(event) => setFilter(event.target.value)} value={filter}><option value="ALL">全部状态</option><option value="UNMATCHED">待映射</option><option value="AUTO_MATCHED">自动匹配</option><option value="MANUAL">手工关联</option></select></div></div>
    {rows.length === 0 ? <div className="empty"><div><PackageOpen size={30} /><strong>当前筛选下没有商品</strong><span>切换状态查看其他平台商品。</span></div></div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>平台商品</th><th>平台</th><th>商家编码</th><th>状态</th><th>统一商品</th><th>手工关联</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><div className="product-name"><strong>{row.title}</strong><span>{row.externalProductId}</span></div></td><td><span className="badge">{row.platform}</span></td><td>{row.merchantCode || "—"}</td><td><span className={`badge ${row.status === "UNMATCHED" ? "orange" : row.status === "MANUAL" ? "gray" : ""}`}>{row.status === "UNMATCHED" ? "待映射" : row.status === "MANUAL" ? "手工关联" : "自动匹配"}</span></td><td>{row.unifiedProductName ?? "未关联"}</td><td><div className="toolbar"><select aria-label={`为 ${row.title} 选择统一商品`} className="mapping-row-select" onChange={(event) => setSelection((current) => ({ ...current, [row.id]: event.target.value }))} value={selection[row.id] ?? ""}><option value="">选择统一商品</option>{snapshot.products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.code}</option>)}</select><button aria-label="确认关联" className="ghost-button" disabled={!selection[row.id]} onClick={() => link(row.id)} title="确认关联" type="button"><Link2 size={15} /></button></div></td></tr>)}</tbody></table></div>}
  </section>;
}

