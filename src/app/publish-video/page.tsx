import { PublishComposer } from "@/components/publishing/publish-composer";
import { VideoUpload } from "@/components/publishing/video-upload";

export default function PublishVideoPage() {
  return (
    <>
      <VideoUpload />
      <PublishComposer />
    </>
  );
}
