"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { ImagePlus, UploadCloud } from "lucide-react";

const accepted = ["video/mp4", "video/quicktime"];

async function durationMs(file: File) {
  return new Promise<number | null>((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Math.round(video.duration * 1000)); };
    video.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    video.src = url;
  });
}

export function VideoUpload() {
  const input = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [cover, setCover] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  const add = (incoming: FileList | File[]) => {
    const valid = Array.from(incoming).filter((file) => accepted.includes(file.type));
    setFiles((current) => [...current, ...valid]);
    if (valid.length !== Array.from(incoming).length) setMessage("已忽略非 MP4/MOV 文件。");
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); add(event.dataTransfer.files); };

  async function upload() {
    if (!files.length) return;
    setUploading(true); setMessage("");
    let completed = 0;
    for (const file of files) {
      const form = new FormData();
      form.set("video", file);
      if (cover) form.set("cover", cover);
      const duration = await durationMs(file);
      if (duration !== null) form.set("durationMs", String(duration));
      const response = await fetch("/api/videos", { method: "POST", body: form });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "上传失败。" }));
        setMessage(error.error ?? "上传失败。");
        setUploading(false); return;
      }
      completed += 1;
    }
    setFiles([]); setCover(null); setMessage(`已上传 ${completed} 个视频，并创建内容草稿。`); setUploading(false);
    window.dispatchEvent(new Event("publisher:video-uploaded"));
  }

  return <div className="page">
    <header className="page-header"><div><h1>发布视频</h1><p>支持 MP4、MOV 单个或批量上传；文件将先进入内容库。</p></div></header>
    <section className="panel">
      <div className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
        <UploadCloud size={36} />
        <strong>拖拽视频到这里上传</strong>
        <span>或从本机选择 MP4 / MOV 文件，单个文件最大 2GB</span>
        <button type="button" className="primary-button" onClick={() => input.current?.click()}>选择视频</button>
        <input ref={input} type="file" accept="video/mp4,video/quicktime,.mp4,.mov" multiple hidden onChange={(e: ChangeEvent<HTMLInputElement>) => e.target.files && add(e.target.files)} />
      </div>
      <div className="upload-toolbar">
        <button type="button" className="ghost-button" onClick={() => coverInput.current?.click()}><ImagePlus size={15} />{cover ? `封面：${cover.name}` : "选择封面（可选）"}</button>
        <input ref={coverInput} type="file" accept="image/*" hidden onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
        <button type="button" className="primary-button" disabled={uploading || !files.length} onClick={upload}>{uploading ? "上传中…" : `上传 ${files.length || ""} 个视频`}</button>
      </div>
      {message && <p className="status-note">{message}</p>}
      {files.length > 0 && <div className="upload-list">{files.map((file, index) => <div className="upload-item" key={`${file.name}-${index}`}><span>{file.name}</span><small>{(file.size / 1024 / 1024).toFixed(1)} MB</small><button type="button" onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}>移除</button></div>)}</div>}
    </section>
  </div>;
}
