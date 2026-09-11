import { Platform } from "@/generated/prisma";
import { UnavailableRealAdapter } from "@/platforms/real-adapter";

export class KuaishouAdapter extends UnavailableRealAdapter {
  readonly platform = Platform.KUAISHOU;
}

