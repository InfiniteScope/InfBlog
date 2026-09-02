-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_post_likes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "visitorKey" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "post_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_post_likes" ("createdAt", "id", "slug", "visitorKey") SELECT "createdAt", "id", "slug", "visitorKey" FROM "post_likes";
DROP TABLE "post_likes";
ALTER TABLE "new_post_likes" RENAME TO "post_likes";
CREATE INDEX "post_likes_slug_idx" ON "post_likes"("slug");
CREATE UNIQUE INDEX "post_likes_slug_visitorKey_key" ON "post_likes"("slug", "visitorKey");
CREATE UNIQUE INDEX "post_likes_userId_slug_key" ON "post_likes"("userId", "slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
