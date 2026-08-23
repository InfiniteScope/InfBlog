ALTER TABLE "danmu" RENAME TO "danmaku";
DROP INDEX IF EXISTS "danmu_createdAt_idx";
CREATE INDEX "danmaku_createdAt_idx" ON "danmaku"("createdAt");