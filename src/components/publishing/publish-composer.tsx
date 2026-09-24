"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, PlaySquare, Send } from "lucide-react";

type Video = { id: string; fileName: string; byteSize: string; durationMs: number | null };
type Account = { id: string; platform: "DOUYIN" | "KUAISHOU" | "XIAOHONGSHU" | "WECHAT"; displayName: string; status: string; sauMapped: boolean };
type Options = { videos: Video[]; accounts: Account[] };
const labels: Record<Account["platform"], string> = { DOUYIN: "抖音", KUAISHOU: "快手", XIAOHONGSHU: "小红书", WECHAT: "视频号" };

export function PublishComposer() {
  const [options, setOptions] = useState<Options>({ videos: [], accounts: [] });
  const [videoId, setVideoId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [scheduledFor, setScheduledFor] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetch("/api/publish-options").then((r) => r.json()).then((value) => setOptions(value)).catch(() => setMessage("无法加载视频或账号信息。")); }, []);
  const video = useMemo(() => options.videos.find((item) => item.id === videoId), [options.videos, videoId]);
  const accounts = options.accounts.filter((account) => selected.includes(account.id));
  const toggle = (id: string) => setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);

  async function submit() {
    if (!confirmed || !videoId || !title || !selected.length) return;
    setSubmitting(true); setMessage("");
    const response = await fetch("/api/publish-tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ videoId, title, body, tags: tags.split(/[,，]/).map((item) => item.trim()).filter(Boolean), accountIds: selected, scheduledFor: scheduledFor || undefined, dryRun: true }) });
    const result = await response.json().catch(() => ({ error: "任务创建失败。" }));
    setSubmitting(false); setMessage(response.ok ? result.message : result.error);
    if (response.ok) setConfirmed(false);
  }

  return <div className="page">
    <header className="page-header"><div><h1>一键发布</h1><p>选择一个内容、一次填写文案，创建互不影响的四个平台发布任务。</p></div><span className="badge orange">Dry Run 演示模式</span></header>
    <section className="panel publish-composer">
      <div className="section-title"><h2>1. 视频与文案</h2><span>仅显示内容库中已就绪的视频</span></div>
      <label className="form-label">视频<select value={videoId} onChange={(event) => setVideoId(event.target.value)}><option value="">请选择视频</option>{options.videos.map((item) => <option key={item.id} value={item.id}>{item.fileName + " · " + (Number(item.byteSize) / 1024 / 1024).toFixed(1) + " MB"}</option>)}</select></label>
      {video && <div className="video-info"><PlaySquare size={18} /><span>{video.fileName}</span><small>{video.durationMs ? Math.round(video.durationMs / 1000) + " 秒" : "时长待解析"}</small></div>}
      <div className="form-grid"><label className="form-label">标题<input value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} placeholder="请输入标题" /></label><label className="form-label">话题标签<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="例如：新品, 穿搭" /></label></div>
      <label className="form-label">正文<textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="请输入发布正文" rows={5} /></label>
    </section>
    <section className="panel publish-composer"><div className="section-title"><h2>2. 选择平台与账号</h2><span>账号状态来自本地绑定配置</span></div>
      <div className="target-grid">{options.accounts.map((account) => <label className={selected.includes(account.id) ? "target-card selected" : "target-card"} key={account.id}><input type="checkbox" checked={selected.includes(account.id)} disabled={!account.sauMapped} onChange={() => toggle(account.id)} /><div><strong>{labels[account.platform]}</strong><span>{account.displayName}</span><small>{account.sauMapped ? account.status : "未配置 sauAccountName"}</small></div></label>)}</div>
      <label className="form-label schedule-field"><CalendarClock size={16} />定时发布（可选）<input type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} /></label>
    </section>
    <section className="panel publish-composer confirm-panel"><div className="section-title"><h2>3. 最终确认</h2><span>本阶段始终是 Mock / Dry Run</span></div>
      <div className="confirm-summary"><p><b>视频：</b>{video?.fileName ?? "未选择"}</p><p><b>文案：</b>{title || "未填写"} · {body || "无正文"} · {tags || "无标签"}</p><p><b>平台：</b>{accounts.length ? accounts.map((account) => labels[account.platform] + "（" + account.displayName + "）").join("、") : "未选择"}</p><p><b>发布时间：</b>{scheduledFor || "立即 Dry Run"}</p></div>
      <label className="confirm-check"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />我已核对视频、文案、平台、账号与发布时间</label>
      <button className="primary-button" type="button" disabled={!confirmed || !videoId || !title || !selected.length || submitting} onClick={submit}><Send size={16} />{submitting ? "创建中…" : "确认并创建 Dry Run 任务"}</button>
      {message && <p className="status-note"><CheckCircle2 size={14} />{message}</p>}
    </section>
  </div>;
}
