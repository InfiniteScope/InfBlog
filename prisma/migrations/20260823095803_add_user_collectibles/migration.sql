-- CreateTable
CREATE TABLE "user_collectibles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_collectibles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "user_collectibles_userId_idx" ON "user_collectibles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_collectibles_userId_itemId_key" ON "user_collectibles"("userId", "itemId");
