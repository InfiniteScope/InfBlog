-- CreateTable
CREATE TABLE "post_stats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "monthKey" TEXT NOT NULL DEFAULT '',
    "monthViews" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "post_likes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "visitorKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "post_favorites" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "post_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "post_stats_slug_key" ON "post_stats"("slug");

-- CreateIndex
CREATE INDEX "post_likes_slug_idx" ON "post_likes"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "post_likes_slug_visitorKey_key" ON "post_likes"("slug", "visitorKey");

-- CreateIndex
CREATE INDEX "post_favorites_userId_idx" ON "post_favorites"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "post_favorites_userId_slug_key" ON "post_favorites"("userId", "slug");
