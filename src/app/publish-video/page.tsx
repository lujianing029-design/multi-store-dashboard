import { PublishComposer } from "@/components/publishing/publish-composer";
import { VideoUpload } from "@/components/publishing/video-upload";

export default function PublishVideoPage() {
  return (
    <div className="page">
      <div className="page-header"><div><h1>发布视频</h1><p>准备内容并选择要发布的平台与账号。</p></div></div>
      <div className="publish-stepper" aria-label="发布步骤">
        {['上传视频','内容与文案','平台与账号','发布时间','最终确认'].map((label, index) => <div className={index === 0 ? 'publish-step active' : 'publish-step'} key={label}><b>{index + 1}</b><span>{label}</span></div>)}
      </div>
      <VideoUpload />
      <PublishComposer />
    </div>
  );
}
