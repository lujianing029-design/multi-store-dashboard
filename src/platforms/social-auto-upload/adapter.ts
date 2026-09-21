import type { Platform } from "@/generated/prisma";
import type { PublisherAdapter, PublisherAccountCheck } from "@/platforms/publisher/types";
import { checkSauAccount, sauPlatformCommand } from "@/platforms/social-auto-upload/cli";

export class SocialAutoUploadAdapter implements PublisherAdapter {
  readonly name = "social-auto-upload";

  supports(platform: Platform) {
    return sauPlatformCommand(platform) !== null;
  }

  async checkAccount(input: { platform: Platform; accountName: string }): Promise<PublisherAccountCheck> {
    const result = await checkSauAccount(input.platform, input.accountName);
    return { ...result, platform: input.platform };
  }

  async publish(): Promise<never> {
    throw new Error("Publishing is intentionally disabled during Issue #3A validation.");
  }
}
