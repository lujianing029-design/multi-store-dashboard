import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductBarChart, SalesTrendChart } from "@/components/dashboard/charts";
import { PageHeader } from "@/components/dashboard/page-header";
import { RangeFilter } from "@/components/dashboard/range-filter";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/dashboard/format";
import { getProductDetailSnapshot } from "@/lib/dashboard/service";
import { parsePreset } from "@/lib/metrics/timezone";

export default async function ProductDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ range?: string }> }) {
  const preset = parsePreset((await searchParams).range);
  const data = await getProductDetailSnapshot((await params).id, preset);
  if (!data) notFound();
  return <div className="page"><Link className="detail-back" href={`/products?range=${preset}`}><ArrowLeft size={14} />返回商品排行</Link><PageHeader title={data.product.name} description={`${data.product.code} · 跨平台商品详情`} actions={<RangeFilter value={preset} />} />
    <section className="detail-summary"><div className="summary-cell"><span>支付销售额</span><strong>{formatCurrency(data.product.gmv)}</strong></div><div className="summary-cell"><span>净销售额</span><strong>{formatCurrency(data.product.netSales)}</strong></div><div className="summary-cell"><span>销售件数</span><strong>{formatNumber(data.product.unitsSold)}</strong></div><div className="summary-cell"><span>退款率</span><strong>{formatPercent(data.product.refundRate)}</strong></div></section>
    <div className="dashboard-grid"><section className="panel"><div className="section-title"><h2>商品销售趋势</h2><span>支付销售额与净销售额</span></div><SalesTrendChart data={data.trend} /></section><section className="panel"><div className="section-title"><h2>平台表现</h2><span>支付销售额</span></div><ProductBarChart data={data.platforms} /></section></div>
    <section className="panel table-panel"><div className="table-head"><h2>平台拆分</h2></div><div className="table-wrap"><table className="data-table"><thead><tr><th>平台</th><th className="numeric">销售件数</th><th className="numeric">支付销售额</th><th className="numeric">客单价</th><th className="numeric">退款率</th></tr></thead><tbody>{data.platforms.map((row) => <tr key={row.platform}><td><span className="badge">{row.platform}</span></td><td className="numeric">{formatNumber(row.unitsSold)}</td><td className="numeric">{formatCurrency(row.gmv)}</td><td className="numeric">{formatCurrency(row.aov)}</td><td className="numeric">{formatPercent(row.refundRate)}</td></tr>)}</tbody></table></div></section>
    <section className="panel table-panel" style={{ marginTop: 20 }}><div className="table-head"><h2>SKU 表现</h2></div>{data.skus.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>SKU</th><th>平台</th><th className="numeric">销售件数</th><th className="numeric">支付销售额</th></tr></thead><tbody>{data.skus.map((sku) => <tr key={`${sku.platform}-${sku.code}`}><td><div className="product-name"><strong>{sku.name}</strong><span>{sku.code}</span></div></td><td>{sku.platform}</td><td className="numeric">{formatNumber(sku.unitsSold)}</td><td className="numeric">{formatCurrency(sku.gmv)}</td></tr>)}</tbody></table></div> : <div className="empty"><div><strong>暂无 SKU 明细</strong><span>当前聚合数据仅覆盖统一商品维度。</span></div></div>}</section>
  </div>;
}

