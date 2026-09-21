import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PlatformChart, SalesTrendChart } from "@/components/dashboard/charts";
import { KpiGrid } from "@/components/dashboard/kpi-grid";
import { PageHeader } from "@/components/dashboard/page-header";
import { RangeFilter } from "@/components/dashboard/range-filter";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/dashboard/format";
import { getDashboardSnapshot } from "@/lib/dashboard/service";
import { parsePreset } from "@/lib/metrics/timezone";

export default async function Home({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const preset = parsePreset((await searchParams).range);
  const data = await getDashboardSnapshot(preset);
  return <div className="page">
    <PageHeader title="经营总览" description={data.rangeLabel} updatedAt={data.updatedAt} actions={<RangeFilter value={preset} />} />
    <section className="panel" style={{ marginBottom: 20 }}>
      <div className="section-title"><h2>今日发布概览</h2><span>演示模式 · 发布任务尚未启用 Worker</span></div>
      <div className="detail-summary">
        {[["今日上传", "0"], ["等待发布", "0"], ["发布中", "0"], ["成功", "0"], ["失败", "0"]].map(([label, value]) => (
          <div className="summary-cell" key={label}><span>{label}</span><strong>{value}</strong></div>
        ))}
      </div>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>最近任务</th><th>状态</th><th>计划时间</th></tr></thead><tbody><tr><td colSpan={3} style={{ textAlign: "center", color: "#69756f" }}>暂无发布任务。请在后续 Issue 接入任务创建与 Worker。</td></tr></tbody></table></div>
    </section>
    <KpiGrid items={data.kpis} />
    <div className="dashboard-grid">
      <section className="panel"><div className="section-title"><h2>销售趋势</h2><span>人民币 · 按自然日</span></div><SalesTrendChart data={data.trend} /></section>
      <section className="panel"><div className="section-title"><h2>平台贡献</h2><span>支付销售额占比</span></div><PlatformChart data={data.contributions} /></section>
    </div>
    <section className="panel table-panel">
      <div className="table-head"><h2>热销商品</h2><Link className="text-link" href={`/products?range=${preset}`}>查看全部 <ArrowRight size={14} /></Link></div>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>商品</th><th>主力平台</th><th className="numeric">销售件数</th><th className="numeric">支付销售额</th><th className="numeric">净销售额</th><th className="numeric">退款率</th></tr></thead><tbody>{data.products.slice(0, 6).map((product) => <tr key={product.id}><td><Link className="product-name" href={`/products/${product.id}?range=${preset}`}><strong>{product.name}</strong><span>{product.code}</span></Link></td><td><span className="badge">{product.leadingPlatform}</span></td><td className="numeric">{formatNumber(product.unitsSold)}</td><td className="numeric">{formatCurrency(product.gmv)}</td><td className="numeric">{formatCurrency(product.netSales)}</td><td className="numeric">{formatPercent(product.refundRate)}</td></tr>)}</tbody></table></div>
    </section>
    <div className="refund-callout"><span>退款健康度 · 当前退款金额占支付销售额</span><strong>{formatPercent(Number(data.kpis.find((item) => item.label === "退款率")?.value ?? 0))}</strong></div>
  </div>;
}

