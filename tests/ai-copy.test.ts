import assert from "node:assert/strict";
import test from "node:test";
import { getAiCopyProvider } from "../src/lib/ai-copy/provider";
import { adaptAllPlatforms } from "../src/lib/ai-copy/content-adapters";
import { normalizeDraft } from "../src/lib/ai-copy/types";

test("unconfigured AI uses visibly named mock content", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousModel = process.env.OPENAI_MODEL;
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_MODEL;
  try {
    const provider = getAiCopyProvider();
    assert.equal(provider.name, "mock");
    const master = await provider.generate({
      productName: "男士夏季五分休闲短裤",
      sellingPoints: "宽松、透气、显瘦",
      audience: "18-35岁男性",
      requirements: "适合短视频带货"
    });
    assert.match(master.title, /男士夏季五分休闲短裤/);
    assert.match(master.body, /宽松/);
    assert.ok(master.tags.length > 0);
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.OPENAI_MODEL; else process.env.OPENAI_MODEL = previousModel;
  }
});

test("content adapters create four independently editable platform drafts", () => {
  const master = normalizeDraft({ title: "夏季短裤", body: "宽松透气", tags: ["穿搭"] });
  const copies = adaptAllPlatforms(master);
  assert.deepEqual(Object.keys(copies).sort(), ["DOUYIN", "KUAISHOU", "WECHAT", "XIAOHONGSHU"]);
  assert.equal(new Set(Object.values(copies).map((copy) => copy.body)).size, 4);
  copies.KUAISHOU.title = "用户修改";
  assert.equal(master.title, "夏季短裤");
  assert.notEqual(copies.DOUYIN.title, copies.KUAISHOU.title);
});
