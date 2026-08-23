-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "background" TEXT NOT NULL DEFAULT 'clean',
    "timePrecision" TEXT NOT NULL DEFAULT 'second',
    "sidebarCollapsed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");
