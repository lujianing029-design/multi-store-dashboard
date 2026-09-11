import Link from "next/link";
import { PackageOpen } from "lucide-react";
export default function ProductNotFound() { return <div className="empty"><div><PackageOpen size={32} /><strong>未找到这个商品</strong><span>商品可能已停用或尚未生成指标。</span><br /><Link className="text-link" href="/products">返回商品排行</Link></div></div>; }

