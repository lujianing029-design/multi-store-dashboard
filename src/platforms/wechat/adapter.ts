import { Platform } from "@/generated/prisma";
import { UnavailableRealAdapter } from "@/platforms/real-adapter";

export class WechatAdapter extends UnavailableRealAdapter {
  readonly platform = Platform.WECHAT;
}

