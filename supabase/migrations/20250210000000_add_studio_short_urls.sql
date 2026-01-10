-- Migration: Add studio_short_urls table
-- Date: 2025-02-10
-- Description: Table for storing shortened URLs for promises

-- 1. Create studio_short_urls table
CREATE TABLE IF NOT EXISTS "studio_short_urls" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "short_code" TEXT NOT NULL UNIQUE,
  "original_url" TEXT NOT NULL,
  "studio_id" TEXT NOT NULL,
  "promise_id" TEXT NOT NULL,
  "studio_slug" TEXT NOT NULL,
  "clicks" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "studio_short_urls_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "studio_short_urls_promise_id_fkey" FOREIGN KEY ("promise_id") REFERENCES "studio_promises"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS "studio_short_urls_short_code_idx" ON "studio_short_urls"("short_code");
CREATE INDEX IF NOT EXISTS "studio_short_urls_studio_id_promise_id_idx" ON "studio_short_urls"("studio_id", "promise_id");
CREATE INDEX IF NOT EXISTS "studio_short_urls_studio_slug_idx" ON "studio_short_urls"("studio_slug");

-- 3. Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updated_at" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_studio_short_urls_updated_at
  BEFORE UPDATE ON "studio_short_urls"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
