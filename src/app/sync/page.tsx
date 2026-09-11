import { AlertCircle, CheckCircle2, Clock3 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { formatDateTime, formatNumber } from "@/lib/dashboard/format";
import { getSyncSnapshot } from "@/lib/dashboard/service";

const syncType = { FULL: "全量", ORDERS: "订单", REFUNDS: "退款", PRODUCTS: "商品" } as Record<string, string>;
export default async function SyncPage() { const data = await getSyncSnapshot(); return <div className="page"><PageHeader title="同步中心" description="查看店铺连接与最近任务，不展示访问令牌等敏感信息" />
  <section className="sync-cards">{data.shops.map((shop) => { const active = shop.connectionStatus === "ACTIVE"; return <article className="sync-shop" key={shop.id}><div className="sync-shop-top"><h2>{shop.name}</h2><span className={active ? "badge" : "badge red"}>{active ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}{active ? "连接正常" : "需要关注"}</span></div><div className="sync-meta"><span className="badge gray">{shop.platform}</span><Clock3 size={13} />最近成功 {formatDateTime(shop.lastSuccessfulSyncAt)}</div></article>; })}</section>
  <section className="panel table-panel"><div className="table-head"><div><h2>最近同步任务</h2><span className="status-note">错误信息已脱敏</span></div></div><div className="table-wrap"><table className="data-table"><thead><tr><th>店铺</th><th>任务</th><th>状态</th><th>开始时间</th><th>同步范围</th><th className="numeric">拉取</th><th className="numeric">写入</th><th>结果</th></tr></thead><tbody>{data.runs.map((run) => <tr key={run.id}><td><div className="product-name"><strong>{run.shopName}</strong><span>{run.platform}</span></div></td><td>{syncType[run.syncType] ?? run.syncType}</td><td><span className={run.status === "SUCCESS" ? "badge" : "badge red"}>{run.status === "SUCCESS" ? "成功" : "失败"}</span></td><td>{formatDateTime(run.startedAt)}</td><td>{run.rangeLabel}</td><td className="numeric">{formatNumber(run.fetched)}</td><td className="numeric">{formatNumber(run.upserted)}</td><td>{run.errorMessage ?? "完成"}</td></tr>)}</tbody></table></div></section>
  </div>; }

