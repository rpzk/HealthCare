-- Terms: allow multiple versions per slug

-- Prisma previously created a unique index on slug; drop it to support multiple versions.
DROP INDEX IF EXISTS "terms_slug_key";

-- Ensure we still have uniqueness per (slug, version)
CREATE UNIQUE INDEX IF NOT EXISTS "terms_slug_version_key" ON "terms"("slug", "version");

-- TermAcceptances: store an immutable snapshot for auditability
ALTER TABLE "term_acceptances" ADD COLUMN IF NOT EXISTS "termSlug" TEXT;
ALTER TABLE "term_acceptances" ADD COLUMN IF NOT EXISTS "termTitle" TEXT;
ALTER TABLE "term_acceptances" ADD COLUMN IF NOT EXISTS "termVersion" TEXT;
ALTER TABLE "term_acceptances" ADD COLUMN IF NOT EXISTS "termContent" TEXT;

-- Backfill snapshots for existing acceptances (if any)
UPDATE "term_acceptances" ta
SET
  "termSlug" = COALESCE(ta."termSlug", t."slug"),
  "termTitle" = COALESCE(ta."termTitle", t."title"),
  "termVersion" = COALESCE(ta."termVersion", t."version"),
  "termContent" = COALESCE(ta."termContent", t."content")
FROM "terms" t
WHERE ta."termId" = t."id";
