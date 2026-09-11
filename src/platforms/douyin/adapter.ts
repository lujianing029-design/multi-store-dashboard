import { Platform } from "@/generated/prisma";
import { UnavailableRealAdapter } from "@/platforms/real-adapter";

export class DouyinAdapter extends UnavailableRealAdapter {
  readonly platform = Platform.DOUYIN;
}

