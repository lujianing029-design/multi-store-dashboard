import type { Platform } from "@/generated/prisma";

export interface PublisherAccountCheck {
  state: "VALID" | "INVALID" | "HUMAN_ACTION_REQUIRED" | "UNAVAILABLE" | "FAILED";
  platform: Platform;
  accountName: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export interface PublisherPublishInput {
  platform: Platform;
  accountName: string;
  file: string;
  title: string;
  description: string;
  tags: string[];
  dryRun: boolean;
}

export interface PublisherPublishResult {
  state: "SUCCEEDED" | "FAILED" | "HUMAN_ACTION_REQUIRED" | "DRY_RUN";
  command: string[];
  exitCode: number | null;
  stdout: string;
  stderr: string;
  remoteUrl: string | null;
  remotePublicationId: string | null;
}

export interface PublisherAdapter {
  readonly name: string;
  supports(platform: Platform): boolean;
  checkAccount(input: { platform: Platform; accountName: string }): Promise<PublisherAccountCheck>;
  publish(input: PublisherPublishInput): Promise<PublisherPublishResult>;
}
