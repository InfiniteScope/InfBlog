-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_post_stats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL DEFAULT 'post',
    "slug" TEXT NOT NULL,
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "monthKey" TEXT NOT NULL DEFAULT '',
    "monthViews" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "favorites" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_post_stats" ("favorites", "id", "likes", "monthKey", "monthViews", "slug", "totalViews") SELECT "favorites", "id", "likes", "monthKey", "monthViews", "slug", "totalViews" FROM "post_stats";
DROP TABLE "post_stats";
ALTER TABLE "new_post_stats" RENAME TO "post_stats";
CREATE UNIQUE INDEX "post_stats_type_slug_key" ON "post_stats"("type", "slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
