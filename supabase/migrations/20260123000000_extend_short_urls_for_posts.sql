-- Migration: Extend studio_short_urls to support posts
-- Date: 2026-01-23
-- Description: Add post_id field and make promise_id optional to support short URLs for posts

-- 1. Make promise_id optional
ALTER TABLE "studio_short_urls" 
  ALTER COLUMN "promise_id" DROP NOT NULL;

-- 2. Add post_id column (optional)
ALTER TABLE "studio_short_urls" 
  ADD COLUMN IF NOT EXISTS "post_id" TEXT;

-- 3. Add foreign key constraint for post_id
ALTER TABLE "studio_short_urls"
  ADD CONSTRAINT "studio_short_urls_post_id_fkey" 
  FOREIGN KEY ("post_id") 
  REFERENCES "studio_posts"("id") 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

-- 4. Add constraint to ensure at least one of promise_id or post_id is set
ALTER TABLE "studio_short_urls"
  ADD CONSTRAINT "studio_short_urls_promise_or_post_check" 
  CHECK (
    ("promise_id" IS NOT NULL AND "post_id" IS NULL) OR 
    ("promise_id" IS NULL AND "post_id" IS NOT NULL)
  );

-- 5. Add index for post_id lookups
CREATE INDEX IF NOT EXISTS "studio_short_urls_studio_id_post_id_idx" 
  ON "studio_short_urls"("studio_id", "post_id") 
  WHERE "post_id" IS NOT NULL;

-- 6. Add index for post_id alone (for cascade deletes)
CREATE INDEX IF NOT EXISTS "studio_short_urls_post_id_idx" 
  ON "studio_short_urls"("post_id") 
  WHERE "post_id" IS NOT NULL;
