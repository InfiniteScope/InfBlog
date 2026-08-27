-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_post_stats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "monthKey" TEXT NOT NULL DEFAULT '',
    "monthViews" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "favorites" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_post_stats" ("id", "likes", "monthKey", "monthViews", "slug", "totalViews") SELECT "id", "likes", "monthKey", "monthViews", "slug", "totalViews" FROM "post_stats";
DROP TABLE "post_stats";
ALTER TABLE "new_post_stats" RENAME TO "post_stats";
CREATE UNIQUE INDEX "post_stats_slug_key" ON "post_stats"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
