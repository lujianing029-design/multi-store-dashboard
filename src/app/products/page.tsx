import { PageHeader } from "@/components/dashboard/page-header";
import { ProductTable } from "@/components/dashboard/product-table";
import { RangeFilter } from "@/components/dashboard/range-filter";
import { getDashboardSnapshot } from "@/lib/dashboard/service";
import { parsePreset } from "@/lib/metrics/timezone";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const preset = parsePreset((await searchParams).range);
  const data = await getDashboardSnapshot(preset);
  return <div className="page"><PageHeader title="商品排行" description={`${data.rangeLabel} · 统一商品维度`} updatedAt={data.updatedAt} actions={<RangeFilter value={preset} />} /><section className="panel table-panel"><div className="table-head"><div><h2>商品表现</h2><span className="status-note">合并抖音、快手与视频号销售数据</span></div><span className="badge">{data.products.length} 个统一商品</span></div><ProductTable preset={preset} rows={data.products} /></section></div>;
}

