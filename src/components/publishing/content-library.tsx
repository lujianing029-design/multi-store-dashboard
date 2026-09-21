"use client";

import { Search, Trash2, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type LibraryVideo = {
  id: string; fileName: string; mimeType: string; byteSize: string; durationMs: number | null;
  coverKey: string | null; status: string; createdAt: string; contents: Array<{ id: string; title: string }>;
};

const size = (value: string) => `${(Number(value) / 1024 / 1024).toFixed(1)} MB`;
const duration = (value: number | null) => value === null ? "处理中" : `${Math.floor(value / 60000)}:${String(Math.floor(value / 1000) % 60).padStart(2, "0")}`;

export function ContentLibrary() {
  const [videos, setVideos] = useState<LibraryVideo[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<LibraryVideo | null>(null);
  const [message, setMessage] = useState("");

  const load = async () => {
    const response = await fetch("/api/videos");
    if (!response.ok) { setMessage("内容库暂不可用，请确认数据库迁移已执行。"); return; }
    setVideos(await response.json());
  };
  useEffect(() => { void load(); }, []);
  const filtered = useMemo(() => videos.filter((video) => video.fileName.toLowerCase().includes(query.toLowerCase())), [videos, query]);

  async function remove(video: LibraryVideo) {
    if (!confirm(`确定删除“${video.fileName}”吗？`)) return;
    const response = await fetch(`/api/videos/${video.id}`, { method: "DELETE" });
    if (!response.ok) { setMessage("删除失败。"); return; }
    setVideos((current) => current.filter((item) => item.id !== video.id));
    if (selected?.id === video.id) setSelected(null);
  }
  async function edit(video: LibraryVideo) {
    const fileName = prompt("编辑文件名", video.fileName);
    if (!fileName || fileName === video.fileName) return;
    const response = await fetch(`/api/videos/${video.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName }) });
    if (!response.ok) { setMessage("保存失败。"); return; }
    setVideos((current) => current.map((item) => item.id === video.id ? { ...item, fileName } : item));
  }
  async function createTask(video: LibraryVideo) {
    const contentId = video.contents[0]?.id;
    if (!contentId) { setMessage("该视频还没有内容草稿。"); return; }
    const response = await fetch("/api/publish-tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contentId }) });
    setMessage(response.ok ? "已创建草稿发布任务；请在发布任务中补充目标账号。" : "创建发布任务失败。");
  }

  return <div className="page">
    <header className="page-header"><div><h1>内容库</h1><p>管理已上传的视频与对应内容草稿。</p></div></header>
    <section className="panel">
      <div className="library-toolbar"><label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索文件名" /></label><span className="status-note">共 {filtered.length} 个视频</span></div>
      {message && <p className="status-note">{message}</p>}
      <div className="library-grid">
        {filtered.map((video) => <article className="video-card" key={video.id}>
          <button className="video-preview" type="button" onClick={() => setSelected(video)}>
            {video.coverKey ? <img src={`/api/videos/${video.id}/cover`} alt="" /> : <Video size={34} />}
            <span>预览视频</span>
          </button>
          <div className="video-card-body"><strong>{video.fileName}</strong><small>{size(video.byteSize)} · {duration(video.durationMs)} · {new Date(video.createdAt).toLocaleString("zh-CN")}</small>
            <div className="video-actions"><button type="button" className="ghost-button" onClick={() => edit(video)}>编辑</button><button type="button" className="ghost-button" onClick={() => createTask(video)}>创建发布任务</button><button type="button" className="ghost-button danger" onClick={() => remove(video)}><Trash2 size={14} />删除</button></div>
          </div>
        </article>)}
      </div>
      {!filtered.length && <div className="empty"><div><Video size={34} /><strong>暂无视频</strong><p>上传的视频会在这里显示。</p></div></div>}
    </section>
    {selected && <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="video-modal"><button className="ghost-button" onClick={() => setSelected(null)}>关闭</button><video controls autoPlay poster={selected.coverKey ? `/api/videos/${selected.id}/cover` : undefined} src={`/api/videos/${selected.id}/file`} /><p>{selected.fileName}</p></div></div>}
  </div>;
}
