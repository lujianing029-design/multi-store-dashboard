-- Issue #3: an optional storage key for the uploaded cover image.
ALTER TABLE "videos" ADD COLUMN "cover_key" TEXT;
