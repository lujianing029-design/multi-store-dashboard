"use client";
import { CircleAlert, RotateCcw } from "lucide-react";
export default function ErrorPage({ reset }: { reset: () => void }) { return <div className="error-page"><div><CircleAlert size={30} /><h2>数据暂时无法加载</h2><p>请稍后重试，页面不会展示任何连接密钥。</p><button className="primary-button" onClick={reset} type="button"><RotateCcw size={15} />重新加载</button></div></div>; }

