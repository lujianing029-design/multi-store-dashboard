import type { Platform } from "@/generated/prisma";

export interface PublisherAccountCheck {
  state: "VALID" | "INVALID" | "HUMAN_ACTION_REQUIRED" | "UNAVAILABLE" | "FAILED";
  platform: Platform;
  accountName: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export interface PublisherAdapter {
  readonly name: string;
  supports(platform: Platform): boolean;
  checkAccount(input: { platform: Platform; accountName: string }): Promise<PublisherAccountCheck>;
}
