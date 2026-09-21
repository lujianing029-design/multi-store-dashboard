-- Issue #2: publishing domain and Chinese admin foundation
CREATE TYPE "VideoStatus" AS ENUM ('PENDING', 'READY', 'FAILED', 'ARCHIVED');
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'READY', 'ARCHIVED');
CREATE TYPE "PublishTaskStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
CREATE TYPE "PublishTargetStatus" AS ENUM ('PENDING', 'QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
CREATE TYPE "PublishJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'RETRY_WAIT', 'CANCELLED');
CREATE TYPE "PublishResultStatus" AS ENUM ('SUCCESS', 'FAILED');
CREATE TYPE "PublishLogLevel" AS ENUM ('INFO', 'WARN', 'ERROR');
CREATE TYPE "ScheduleType" AS ENUM ('ONCE', 'CRON');

CREATE TABLE "users" (
  "id" UUID NOT NULL, "email" TEXT NOT NULL, "display_name" TEXT, "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE TABLE "platform_accounts" (
  "id" UUID NOT NULL, "user_id" UUID, "platform" "Platform" NOT NULL, "external_account_id" TEXT NOT NULL,
  "display_name" TEXT NOT NULL, "status" "ConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
  "credential_ref" TEXT, "access_token_expires_at" TIMESTAMPTZ(3), "settings" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "platform_accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "platform_accounts_platform_external_account_id_key" ON "platform_accounts"("platform", "external_account_id");
CREATE INDEX "platform_accounts_user_id_status_idx" ON "platform_accounts"("user_id", "status");

CREATE TABLE "videos" (
  "id" UUID NOT NULL, "user_id" UUID, "storage_key" TEXT NOT NULL, "file_name" TEXT NOT NULL, "mime_type" TEXT NOT NULL,
  "byte_size" BIGINT NOT NULL, "duration_ms" INTEGER, "width" INTEGER, "height" INTEGER, "sha256" TEXT NOT NULL,
  "status" "VideoStatus" NOT NULL DEFAULT 'PENDING', "metadata" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "videos_storage_key_key" ON "videos"("storage_key");
CREATE INDEX "videos_user_id_status_idx" ON "videos"("user_id", "status");
CREATE INDEX "videos_sha256_idx" ON "videos"("sha256");

CREATE TABLE "contents" (
  "id" UUID NOT NULL, "user_id" UUID, "video_id" UUID, "title" TEXT NOT NULL, "body" TEXT,
  "hashtags" JSONB, "cover_url" TEXT, "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT', "metadata" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "contents_user_id_status_idx" ON "contents"("user_id", "status");
CREATE INDEX "contents_video_id_idx" ON "contents"("video_id");

CREATE TABLE "publish_tasks" (
  "id" UUID NOT NULL, "content_id" UUID NOT NULL, "created_by_id" UUID, "status" "PublishTaskStatus" NOT NULL DEFAULT 'DRAFT',
  "scheduled_for" TIMESTAMPTZ(3), "idempotency_key" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "publish_tasks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "publish_tasks_idempotency_key_key" ON "publish_tasks"("idempotency_key");
CREATE INDEX "publish_tasks_status_scheduled_for_idx" ON "publish_tasks"("status", "scheduled_for");

CREATE TABLE "publish_targets" (
  "id" UUID NOT NULL, "publish_task_id" UUID NOT NULL, "platform_account_id" UUID NOT NULL,
  "status" "PublishTargetStatus" NOT NULL DEFAULT 'PENDING', "platform_payload" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "publish_targets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "publish_targets_publish_task_id_platform_account_id_key" ON "publish_targets"("publish_task_id", "platform_account_id");
CREATE INDEX "publish_targets_platform_account_id_status_idx" ON "publish_targets"("platform_account_id", "status");

CREATE TABLE "publish_jobs" (
  "id" UUID NOT NULL, "publish_target_id" UUID NOT NULL, "attempt_no" INTEGER NOT NULL DEFAULT 1,
  "status" "PublishJobStatus" NOT NULL DEFAULT 'PENDING', "run_after" TIMESTAMPTZ(3), "started_at" TIMESTAMPTZ(3),
  "finished_at" TIMESTAMPTZ(3), "error_code" TEXT, "error_message" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "publish_jobs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "publish_jobs_publish_target_id_attempt_no_key" ON "publish_jobs"("publish_target_id", "attempt_no");
CREATE INDEX "publish_jobs_status_run_after_idx" ON "publish_jobs"("status", "run_after");

CREATE TABLE "publish_results" (
  "id" UUID NOT NULL, "publish_job_id" UUID NOT NULL, "status" "PublishResultStatus" NOT NULL,
  "remote_publication_id" TEXT, "remote_url" TEXT, "response_summary" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "publish_results_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "publish_results_publish_job_id_key" ON "publish_results"("publish_job_id");
CREATE INDEX "publish_results_remote_publication_id_idx" ON "publish_results"("remote_publication_id");

CREATE TABLE "publish_logs" (
  "id" UUID NOT NULL, "publish_task_id" UUID NOT NULL, "publish_job_id" UUID,
  "level" "PublishLogLevel" NOT NULL DEFAULT 'INFO', "event" TEXT NOT NULL, "message" TEXT NOT NULL,
  "metadata" JSONB, "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "publish_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "publish_logs_publish_task_id_created_at_idx" ON "publish_logs"("publish_task_id", "created_at");
CREATE INDEX "publish_logs_publish_job_id_created_at_idx" ON "publish_logs"("publish_job_id", "created_at");

CREATE TABLE "schedules" (
  "id" UUID NOT NULL, "user_id" UUID, "content_id" UUID NOT NULL, "publish_task_id" UUID,
  "type" "ScheduleType" NOT NULL, "cron_expression" TEXT, "run_at" TIMESTAMPTZ(3), "timezone" TEXT NOT NULL DEFAULT 'Asia/Shanghai',
  "enabled" BOOLEAN NOT NULL DEFAULT true, "next_run_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "schedules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "schedules_type_expression_check" CHECK (("type" = 'ONCE' AND "run_at" IS NOT NULL) OR ("type" = 'CRON' AND "cron_expression" IS NOT NULL))
);
CREATE INDEX "schedules_enabled_next_run_at_idx" ON "schedules"("enabled", "next_run_at");

ALTER TABLE "platform_accounts" ADD CONSTRAINT "platform_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "videos" ADD CONSTRAINT "videos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contents" ADD CONSTRAINT "contents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contents" ADD CONSTRAINT "contents_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "publish_tasks" ADD CONSTRAINT "publish_tasks_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "publish_tasks" ADD CONSTRAINT "publish_tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "publish_targets" ADD CONSTRAINT "publish_targets_publish_task_id_fkey" FOREIGN KEY ("publish_task_id") REFERENCES "publish_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "publish_targets" ADD CONSTRAINT "publish_targets_platform_account_id_fkey" FOREIGN KEY ("platform_account_id") REFERENCES "platform_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "publish_jobs" ADD CONSTRAINT "publish_jobs_publish_target_id_fkey" FOREIGN KEY ("publish_target_id") REFERENCES "publish_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "publish_results" ADD CONSTRAINT "publish_results_publish_job_id_fkey" FOREIGN KEY ("publish_job_id") REFERENCES "publish_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "publish_logs" ADD CONSTRAINT "publish_logs_publish_task_id_fkey" FOREIGN KEY ("publish_task_id") REFERENCES "publish_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "publish_logs" ADD CONSTRAINT "publish_logs_publish_job_id_fkey" FOREIGN KEY ("publish_job_id") REFERENCES "publish_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_publish_task_id_fkey" FOREIGN KEY ("publish_task_id") REFERENCES "publish_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
