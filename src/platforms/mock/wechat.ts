import { Platform } from "@/generated/prisma";
import { DeterministicMockAdapter } from "@/platforms/mock/base";

export class MockWechatAdapter extends DeterministicMockAdapter {
  constructor() {
    super({
      platform: Platform.WECHAT,
      externalPrefix: "MOCK-WX",
      titlePrefix: "会员精选",
      orderCount: 5,
      refundEvery: 5
    });
  }
}

