import type { AiCopyProvider, ProductBrief } from "@/lib/ai-copy/types";
import { normalizeDraft } from "@/lib/ai-copy/types";

class MockCopyProvider implements AiCopyProvider {
  readonly name = "mock" as const;

  async generate(brief: ProductBrief) {
    const points = brief.sellingPoints.split(/[,，、]/).map((item) => item.trim()).filter(Boolean);
    const title = `${brief.productName}｜${points.slice(0, 2).join("·") || "新品分享"}`.slice(0, 100);
    const body = `认识一下${brief.productName}。\n${points.length ? "亮点：" + points.join("、") + "。\n" : ""}${brief.audience ? "适合：" + brief.audience + "。\n" : ""}${brief.requirements ? "补充：" + brief.requirements + "。\n" : ""}请根据实际商品信息核对文案后再使用。`;
    return { title, body, tags: [brief.productName.replace(/\s+/g, "").slice(0, 12), "好物分享"] };
  }
}

class OpenAiCopyProvider implements AiCopyProvider {
  readonly name = "openai" as const;
  constructor(private readonly apiKey: string, private readonly model: string) {}

  async generate(brief: ProductBrief) {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        store: false,
        instructions: "你是中文短视频商品文案助手。只输出 JSON 对象，字段为 title 字符串、body 字符串、tags 字符串数组。使用用户提供的事实，不编造材质、价格、功效、承诺或促销信息。文案需要可编辑、简洁。不要包含 markdown。",
        input: JSON.stringify(brief)
      }),
      signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) throw new Error(`AI 服务返回 ${response.status}，请稍后重试或手动填写。`);
    const data: unknown = await response.json();
    if (!data || typeof data !== "object") throw new Error("AI 服务返回格式错误。");
    const output = (data as { output?: unknown }).output;
    if (!Array.isArray(output)) throw new Error("AI 服务未返回正文。");
    const text = output.flatMap((item) => {
      if (!item || typeof item !== "object" || !("content" in item) || !Array.isArray(item.content)) return [];
      return item.content.flatMap((part: unknown) => part && typeof part === "object" && "type" in part && part.type === "output_text" && "text" in part && typeof part.text === "string" ? [part.text] : []);
    }).join("");
    try { return normalizeDraft(JSON.parse(text)); }
    catch { throw new Error("AI 服务返回的文案格式不正确，请重试或手动填写。"); }
  }
}

export function getAiCopyProvider(): AiCopyProvider {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  return apiKey && model ? new OpenAiCopyProvider(apiKey, model) : new MockCopyProvider();
}
