import { Platform } from "@/generated/prisma";
import { DeterministicMockAdapter } from "@/platforms/mock/base";

export class MockKuaishouAdapter extends DeterministicMockAdapter {
  constructor() {
    super({
      platform: Platform.KUAISHOU,
      externalPrefix: "MOCK-KS",
      titlePrefix: "老铁严选",
      orderCount: 6,
      refundEvery: 3
    });
  }
}

