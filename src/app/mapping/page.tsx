import { MappingTable } from "@/components/dashboard/mapping-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { getMappingSnapshot } from "@/lib/dashboard/service";
export default async function MappingPage() { const data = await getMappingSnapshot(); const pending = data.rows.filter((row) => row.status === "UNMATCHED").length; return <div className="page"><PageHeader title="商品映射" description="将各平台商品归并到统一商品，手工关联在后续同步中保持不变" actions={<span className={pending ? "badge orange" : "badge"}>{pending} 个待处理</span>} /><MappingTable initial={data} /></div>; }

