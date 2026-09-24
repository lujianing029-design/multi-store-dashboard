"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, PlaySquare, Send } from "lucide-react";

type Platform = "DOUYIN" | "KUAISHOU" | "XIAOHONGSHU" | "WECHAT";
type Copy = { title: string; body: string; tags: string[] };
type Copies = Record<Platform, Copy>;
type Video = { id: string; fileName: string; byteSize: string; durationMs: number | null };
type Account = { id: string; platform: Platform; displayName: string; status: string; sauMapped: boolean };
type Options = { videos: Video[]; accounts: Account[] };
const platforms: Platform[] = ["DOUYIN", "KUAISHOU", "XIAOHONGSHU", "WECHAT"];
const labels: Record<Platform, string> = { DOUYIN: "抖音", KUAISHOU: "快手", XIAOHONGSHU: "小红书", WECHAT: "视频号" };
const splitTags = (value: string) => value.split(/[,，、\n]/).map((tag) => tag.replace(/^#/, "").trim()).filter(Boolean);

export function PublishComposer() {
  const [options, setOptions] = useState<Options>({ videos: [], accounts: [] });
  const [videoId, setVideoId] = useState("");
  const [brief, setBrief] = useState({ productName: "", sellingPoints: "", audience: "", requirements: "" });
  const [master, setMaster] = useState<Copy>({ title: "", body: "", tags: [] });
  const [copies, setCopies] = useState<Copies | null>(null);
  const [masterTagsText, setMasterTagsText] = useState("");
  const [copyTagsText, setCopyTagsText] = useState<Record<Platform, string>>({ DOUYIN: "", KUAISHOU: "", XIAOHONGSHU: "", WECHAT: "" });
  const [provider, setProvider] = useState<"mock" | "openai" | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [scheduledFor, setScheduledFor] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadOptions = useCallback(() => {
    fetch("/api/publish-options").then((response) => response.json()).then((value: Options) => setOptions(value)).catch(() => setMessage("无法加载视频或账号信息。"));
  }, []);
  useEffect(() => {
    loadOptions();
    window.addEventListener("publisher:video-uploaded", loadOptions);
    return () => window.removeEventListener("publisher:video-uploaded", loadOptions);
  }, [loadOptions]);

  const video = useMemo(() => options.videos.find((item) => item.id === videoId), [options.videos, videoId]);
  const accounts = options.accounts.filter((account) => selected.includes(account.id));
  const selectedPlatforms = [...new Set(accounts.map((account) => account.platform))];
  const changeMaster = (patch: Partial<Copy>) => { setMaster((value) => ({ ...value, ...patch })); setConfirmed(false); };
  const changeCopy = (platform: Platform, patch: Partial<Copy>) => {
    setCopies((value) => value ? { ...value, [platform]: { ...value[platform], ...patch } } : value);
    setConfirmed(false);
  };
  const toggle = (id: string) => { setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]); setConfirmed(false); };

  async function generate() {
    if (!brief.productName.trim()) { setMessage("请先填写商品名称。"); return; }
    setGenerating(true); setMessage("");
    try {
      const response = await fetch("/api/ai-copy", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(brief) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "文案生成失败。");
      setMaster(result.master);
      setMasterTagsText(result.master.tags.join("，"));
      setCopies(result.platforms);
      setCopyTagsText(Object.fromEntries(platforms.map((platform) => [platform, result.platforms[platform].tags.join("，")])) as Record<Platform, string>);
      setProvider(result.provider);
      setConfirmed(false);
      setMessage(result.provider === "mock" ? "已生成 Mock 示例文案；当前环境未配置真实 AI 服务，请核对并编辑。" : "AI 文案已生成，请核对并编辑。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "文案生成失败；仍可手动填写。");
    } finally { setGenerating(false); }
  }

  async function adaptMaster() {
    if (!master.title.trim() || !master.body.trim()) { setMessage("请先填写主标题和主正文。"); return; }
    try {
      const response = await fetch("/api/ai-copy/adapt", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(master) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "平台文案适配失败。");
      setCopies(result.platforms);
      setCopyTagsText(Object.fromEntries(platforms.map((platform) => [platform, result.platforms[platform].tags.join("，")])) as Record<Platform, string>);
      setConfirmed(false);
      setMessage("四平台文案已按主文案重新适配。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "平台文案适配失败。"); }
  }

  function restoreMaster(platform: Platform) {
    if (!copies) return;
    changeCopy(platform, { title: master.title, body: master.body, tags: [...master.tags] });
    setCopyTagsText((value) => ({ ...value, [platform]: masterTagsText }));
  }

  async function submit() {
    if (!confirmed || !videoId || !master.title.trim() || !selected.length || !copies) return;
    setSubmitting(true); setMessage("");
    try {
      const response = await fetch("/api/publish-tasks", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ videoId, title: master.title, body: master.body, tags: master.tags, platformCopies: copies, accountIds: selected, scheduledFor: scheduledFor || undefined, dryRun: true })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "任务创建失败。");
      setConfirmed(false);
      setMessage(result.message);
    } catch (error) { setMessage(error instanceof Error ? error.message : "任务创建失败。"); }
    finally { setSubmitting(false); }
  }

  const ready = Boolean(videoId && master.title.trim() && copies && selected.length && selectedPlatforms.every((platform) => copies[platform].title.trim() && copies[platform].body.trim()));
  return <div className="page">
    <header className="page-header"><div><h1>一键发布</h1><p>上传视频，编辑主文案和四平台文案，再核对目标账号与时间。</p></div><span className="badge orange">Dry Run 演示模式</span></header>
    <section className="panel publish-composer">
      <div className="section-title"><h2>1. 视频与商品信息</h2><span>上传后会自动刷新视频列表</span></div>
      <label className="form-label">视频<select value={videoId} onChange={(event) => { setVideoId(event.target.value); setConfirmed(false); }}><option value="">请选择视频</option>{options.videos.map((item) => <option key={item.id} value={item.id}>{item.fileName + " · " + (Number(item.byteSize) / 1024 / 1024).toFixed(1) + " MB"}</option>)}</select></label>
      {video && <div className="video-info"><PlaySquare size={18} /><span>{video.fileName}</span><small>{video.durationMs ? Math.round(video.durationMs / 1000) + " 秒" : "时长待解析"}</small></div>}
      <div className="section-title"><h2>AI 生成文案</h2><span>商品信息仅用于生成草稿</span></div>
      <div className="form-grid">
        <label className="form-label">商品名称<input value={brief.productName} onChange={(event) => setBrief({ ...brief, productName: event.target.value })} placeholder="例如：男士夏季五分休闲短裤" /></label>
        <label className="form-label">商品卖点<input value={brief.sellingPoints} onChange={(event) => setBrief({ ...brief, sellingPoints: event.target.value })} placeholder="宽松、透气、显瘦、夏季新款" /></label>
        <label className="form-label">目标用户<input value={brief.audience} onChange={(event) => setBrief({ ...brief, audience: event.target.value })} placeholder="18-35岁男性" /></label>
        <label className="form-label">补充要求<input value={brief.requirements} onChange={(event) => setBrief({ ...brief, requirements: event.target.value })} placeholder="适合短视频带货" /></label>
      </div>
      <div className="copy-actions"><button type="button" className="primary-button" disabled={generating || !videoId} onClick={generate}>{generating ? "生成中…" : "AI生成文案"}</button><button type="button" className="ghost-button" disabled={generating || !videoId} onClick={generate}>重新生成</button><span className="status-note">{provider === "mock" ? "当前为 Mock Provider 示例" : provider === "openai" ? "由 AI Provider 生成" : "也可完全手动编辑"}</span></div>
      <div className="section-title"><h2>主文案</h2><span>所有字段可手动编辑</span></div>
      <label className="form-label">主标题<input value={master.title} maxLength={100} onChange={(event) => changeMaster({ title: event.target.value })} placeholder="请输入标题" /></label>
      <label className="form-label">主正文<textarea value={master.body} onChange={(event) => changeMaster({ body: event.target.value })} placeholder="请输入正文" rows={5} /></label>
      <label className="form-label">话题标签<input value={masterTagsText} onChange={(event) => { setMasterTagsText(event.target.value); changeMaster({ tags: splitTags(event.target.value) }); }} placeholder="例如：夏季穿搭，休闲短裤" /></label>
      <button type="button" className="ghost-button" onClick={adaptMaster}>用主文案生成四平台草稿</button>
    </section>
    <section className="panel publish-composer">
      <div className="section-title"><h2>2. 四平台文案</h2><span>每个平台可独立修改</span></div>
      {!copies && <p className="status-note">生成 AI 文案，或手动填写主文案后生成平台草稿。</p>}
      {copies && <div className="platform-copy-grid">{platforms.map((platform) => <div className="platform-copy-card" key={platform}>
        <div className="section-title"><h2>{labels[platform]}</h2><button type="button" className="ghost-button" onClick={() => restoreMaster(platform)}>恢复主文案</button></div>
        <label className="form-label">标题<input value={copies[platform].title} onChange={(event) => changeCopy(platform, { title: event.target.value })} /></label>
        <label className="form-label">正文<textarea rows={5} value={copies[platform].body} onChange={(event) => changeCopy(platform, { body: event.target.value })} /></label>
        <label className="form-label">标签<input value={copyTagsText[platform]} onChange={(event) => { setCopyTagsText((value) => ({ ...value, [platform]: event.target.value })); changeCopy(platform, { tags: splitTags(event.target.value) }); }} /></label>
      </div>)}</div>}
    </section>
    <section className="panel publish-composer"><div className="section-title"><h2>3. 选择平台与账号</h2><span>账号状态来自本地绑定配置</span></div>
      <div className="target-grid">{options.accounts.map((account) => <label className={selected.includes(account.id) ? "target-card selected" : "target-card"} key={account.id}><input type="checkbox" checked={selected.includes(account.id)} disabled={!account.sauMapped} onChange={() => toggle(account.id)} /><div><strong>{labels[account.platform]}</strong><span>{account.displayName}</span><small>{account.sauMapped ? account.status : "未配置 sauAccountName"}</small></div></label>)}</div>
      <label className="form-label schedule-field"><CalendarClock size={16} />定时发布（可选）<input type="datetime-local" value={scheduledFor} onChange={(event) => { setScheduledFor(event.target.value); setConfirmed(false); }} /></label>
    </section>
    <section className="panel publish-composer confirm-panel"><div className="section-title"><h2>4. 最终确认</h2><span>AI 文案不会自动触发发布</span></div>
      <div className="confirm-summary"><p><b>视频：</b>{video?.fileName ?? "未选择"}</p><p><b>主文案：</b>{master.title || "未填写"} · {master.body || "无正文"} · {master.tags.join("、") || "无标签"}</p><p><b>发布时间：</b>{scheduledFor || "立即 Dry Run"}</p>
        {accounts.length ? accounts.map((account) => <p key={account.id}><b>{labels[account.platform]}（{account.displayName}）：</b>{copies?.[account.platform].title || "未填写"} · {copies?.[account.platform].body || "无正文"} · {copies?.[account.platform].tags.join("、") || "无标签"}</p>) : <p><b>平台：</b>未选择</p>}
      </div>
      <label className="confirm-check"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />我已核对视频、主文案、各平台文案、账号与发布时间</label>
      <button className="primary-button" type="button" disabled={!confirmed || !ready || submitting} onClick={submit}><Send size={16} />{submitting ? "创建中…" : "确认并创建 Dry Run 任务"}</button>
      {message && <p className="status-note"><CheckCircle2 size={14} />{message}</p>}
    </section>
  </div>;
}
