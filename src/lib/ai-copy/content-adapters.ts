import type { Platform } from "@/generated/prisma";
import type { CopyDraft } from "@/lib/ai-copy/types";

export type SupportedPlatform = Extract<Platform, "DOUYIN" | "KUAISHOU" | "XIAOHONGSHU" | "WECHAT">;
export type PlatformCopies = Record<SupportedPlatform, CopyDraft>;

interface ContentAdapter {
  readonly platform: SupportedPlatform;
  adapt(master: CopyDraft): CopyDraft;
}

const cleanTags = (tags: string[]) => [...new Set(tags.map((tag) => tag.replace(/^#/, "").trim()).filter(Boolean))];
const hashTags = (tags: string[]) => cleanTags(tags).map((tag) => `#${tag}`).join(" ");

const adapters: ContentAdapter[] = [
  {
    platform: "DOUYIN",
    adapt: (master) => ({
      title: master.title.slice(0, 55),
      body: `${master.body}\n${hashTags(master.tags)}`.trim(),
      tags: cleanTags(master.tags)
    })
  },
  {
    platform: "KUAISHOU",
    adapt: (master) => ({
      title: `好物分享｜${master.title}`.slice(0, 70),
      body: `今天分享：${master.title}\n${master.body}\n${hashTags(master.tags)}`.trim(),
      tags: cleanTags(master.tags)
    })
  },
  {
    platform: "XIAOHONGSHU",
    adapt: (master) => ({
      title: `${master.title}｜好物笔记`.slice(0, 80),
      body: `好物笔记 ✍️\n${master.body}\n\n${hashTags(master.tags)}`.trim(),
      tags: cleanTags([...master.tags, "好物笔记"])
    })
  },
  {
    platform: "WECHAT",
    adapt: (master) => ({
      title: `分享：${master.title}`.slice(0, 80),
      body: `${master.body}\n欢迎看看这条视频。`.trim(),
      tags: cleanTags(master.tags)
    })
  }
];

export function adaptAllPlatforms(master: CopyDraft): PlatformCopies {
  return Object.fromEntries(adapters.map((adapter) => [adapter.platform, adapter.adapt(master)])) as PlatformCopies;
}
