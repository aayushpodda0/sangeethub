CREATE TABLE "UserMusicPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "languages" "LanguageCode"[] NOT NULL,
    "genres" TEXT[] NOT NULL,
    "moods" "Mood"[] NOT NULL,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "onboardingSkipped" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMusicPreferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserMusicPreferences_userId_key" ON "UserMusicPreferences"("userId");
CREATE INDEX "UserMusicPreferences_updatedAt_idx" ON "UserMusicPreferences"("updatedAt");
ALTER TABLE "UserMusicPreferences" ADD CONSTRAINT "UserMusicPreferences_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
