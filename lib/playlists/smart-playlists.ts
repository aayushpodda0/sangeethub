import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { musicService } from "@/lib/music/service";
import type { ProviderTrack } from "@/lib/music/provider";
export { buildSmartPlaylistWhere } from "@/lib/music/smart-playlist-filters";
import { smartRulesSchema, type SmartPlaylistRules } from "@/lib/playlists/schemas";

function parseRules(value: Prisma.JsonValue | null): SmartPlaylistRules {
  const parsed = smartRulesSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("Smart playlist contains invalid rules.");
  }
  return parsed.data;
}

export async function findSmartPlaylistTracks(
  rules: SmartPlaylistRules,
  userId: string,
): Promise<ProviderTrack[]> {
  return musicService.getSmartPlaylistTracks(rules, userId);
}

export async function refreshSmartPlaylist(playlistId: string, userId: string): Promise<ProviderTrack[]> {
  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId },
    select: { ownerId: true, isSmart: true, smartRules: true },
  });
  if (!playlist || !playlist.isSmart) return [];
  if (playlist.ownerId !== userId) {
    throw new Error("Only the playlist owner can refresh a smart playlist.");
  }

  const tracks = await findSmartPlaylistTracks(parseRules(playlist.smartRules), userId);
  await prisma.$transaction(async (tx) => {
    await tx.playlistTrack.deleteMany({ where: { playlistId } });
    if (tracks.length > 0) {
      await tx.playlistTrack.createMany({
        data: tracks.map((track, position) => ({
          playlistId,
          trackId: track.id,
          addedById: userId,
          position,
        })),
      });
    }
  });
  return tracks;
}
