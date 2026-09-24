import type { Platform } from "@/generated/prisma";
import type { PublisherAdapter, PublisherAccountCheck, PublisherPublishInput, PublisherPublishResult } from "@/platforms/publisher/types";
import { checkSauAccount, sauPlatformCommand } from "@/platforms/social-auto-upload/cli";
import { publishWithSau } from "@/platforms/social-auto-upload/publish";

export class SocialAutoUploadAdapter implements PublisherAdapter {
  readonly name = "social-auto-upload";

  supports(platform: Platform) {
    return sauPlatformCommand(platform) !== null;
  }

  async checkAccount(input: { platform: Platform; accountName: string }): Promise<PublisherAccountCheck> {
    const result = await checkSauAccount(input.platform, input.accountName);
    return { ...result, platform: input.platform };
  }

  async publish(input: PublisherPublishInput): Promise<PublisherPublishResult> {
    return publishWithSau(input);
  }
}
