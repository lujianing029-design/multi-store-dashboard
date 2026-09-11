import { PageHeader } from "@/components/dashboard/page-header";
import { RangeFilter } from "@/components/dashboard/range-filter";
import { ShopTable } from "@/components/dashboard/shop-table";
import { getDashboardSnapshot } from "@/lib/dashboard/service";
import { parsePreset } from "@/lib/metrics/timezone";

export default async function ShopsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const preset = parsePreset((await searchParams).range);
  const data = await getDashboardSnapshot(preset);
  return <div className="page"><PageHeader title="店铺分析" description={`${data.rangeLabel} · 跨平台口径一致`} updatedAt={data.updatedAt} actions={<RangeFilter value={preset} />} /><section className="panel table-panel"><div className="table-head"><div><h2>店铺经营对比</h2><span className="status-note">点击列名切换排序指标</span></div><span className="badge">{data.shops.length} 家店铺</span></div><ShopTable rows={data.shops} /></section></div>;
}

