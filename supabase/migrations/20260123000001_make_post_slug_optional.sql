-- Migration: Make post slug optional
-- Date: 2026-01-23
-- Description: Make slug optional in studio_posts to support migration from slug-based to CUID-based URLs

-- 1. Make slug nullable (remove NOT NULL constraint)
ALTER TABLE "studio_posts" 
  ALTER COLUMN "slug" DROP NOT NULL;

-- Note: We keep the unique constraint @@unique([studio_id, slug]) 
-- but it will allow NULL values (NULL != NULL in SQL, so multiple NULLs are allowed)
-- This allows gradual migration while maintaining uniqueness for existing slugs
