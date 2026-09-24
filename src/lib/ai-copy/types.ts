export type ProductBrief = {
  productName: string;
  sellingPoints: string;
  audience: string;
  requirements: string;
};

export type CopyDraft = {
  title: string;
  body: string;
  tags: string[];
};

export interface AiCopyProvider {
  readonly name: "mock" | "openai";
  generate(brief: ProductBrief): Promise<CopyDraft>;
}

export function normalizeDraft(value: unknown): CopyDraft {
  if (!value || typeof value !== "object") throw new Error("AI 返回了无效文案。");
  const draft = value as Record<string, unknown>;
  const title = typeof draft.title === "string" ? draft.title.trim().slice(0, 100) : "";
  const body = typeof draft.body === "string" ? draft.body.trim().slice(0, 5000) : "";
  const tags = Array.isArray(draft.tags) ? draft.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.replace(/^#/, "").trim()).filter(Boolean).slice(0, 10) : [];
  if (!title || !body) throw new Error("AI 未返回完整的标题和正文。");
  return { title, body, tags };
}
