ALTER TABLE "Playlist"
  ADD COLUMN "isSmart" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "smartRules" JSONB;

CREATE INDEX "Playlist_isSmart_updatedAt_idx" ON "Playlist"("isSmart", "updatedAt");
