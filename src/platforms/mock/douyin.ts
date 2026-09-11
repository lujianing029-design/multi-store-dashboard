import { Platform } from "@/generated/prisma";
import { DeterministicMockAdapter } from "@/platforms/mock/base";

export class MockDouyinAdapter extends DeterministicMockAdapter {
  constructor() {
    super({
      platform: Platform.DOUYIN,
      externalPrefix: "MOCK-DY",
      titlePrefix: "直播间热卖",
      orderCount: 8,
      refundEvery: 4
    });
  }
}

