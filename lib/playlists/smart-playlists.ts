import type { Activity, LanguageCode, Mood, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { TrackInclude, type ProviderTrack } from "@/lib/music/provider";
import { toDiscoveryTrack } from "@/lib/music/serializers";
import { smartRulesSchema, type SmartPlaylistRules } from "@/lib/playlists/schemas";

const SMART_PLAYLIST_LIMIT = 200;

function parseRules(value: Prisma.JsonValue | null): SmartPlaylistRules {
  const parsed = smartRulesSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("Smart playlist contains invalid rules.");
  }
  return parsed.data;
}

function toDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Smart playlist contains an invalid release date.");
  }
  return date;
}

function buildRuleWhere(rule: SmartPlaylistRules[number], userId: string): Prisma.TrackWhereInput {
  switch (rule.field) {
    case "genre":
      return { genres: { some: { genre: { OR: [{ slug: rule.value }, { name: rule.value }] } } } };
    case "language":
      return { language: rule.value as LanguageCode };
    case "mood":
      return { moods: { has: rule.value as Mood } };
    case "activity":
      return { activities: { has: rule.value as Activity } };
    case "artist":
      return { artists: { some: { artist: { OR: [{ id: rule.value }, { slug: rule.value }] } } } };
    case "liked":
      return rule.value ? { favoritedBy: { some: { userId } } } : { favoritedBy: { none: { userId } } };
    case "recentlyPlayed": {
      const since = new Date(Date.now() - rule.withinDays * 24 * 60 * 60 * 1000);
      return { recentPlays: { some: { userId, playedAt: { gte: since } } } };
    }
    case "releaseDate":
      return { releaseDate: { [rule.operator === "after" ? "gte" : "lte"]: toDate(rule.value) } };
  }
}

export function buildSmartPlaylistWhere(rules: SmartPlaylistRules, userId: string): Prisma.TrackWhereInput {
  return { AND: rules.map((rule) => buildRuleWhere(rule, userId)) };
}

export async function findSmartPlaylistTracks(
  rules: SmartPlaylistRules,
  userId: string,
): Promise<ProviderTrack[]> {
  const tracks = await prisma.track.findMany({
    where: buildSmartPlaylistWhere(rules, userId),
    include: TrackInclude,
    orderBy: [{ releaseDate: "desc" }, { popularity: "desc" }, { title: "asc" }],
    take: SMART_PLAYLIST_LIMIT,
  });
  return tracks.map(toDiscoveryTrack);
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
