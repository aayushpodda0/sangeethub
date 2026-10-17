import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { toDiscoveryTrack } from "@/lib/music/serializers";
import { similarityScore } from "@/lib/music/similarity";
import type { MusicProvider, ProviderTrack } from "@/lib/music/provider";

const trackWithRelations = {
  album: true,
  artists: {
    include: { artist: true },
  },
  genres: {
    include: { genre: true },
  },
} satisfies Prisma.TrackInclude;

export class DemoMusicProvider implements MusicProvider {
  readonly name = "demo";

  async searchTracks(query: string): Promise<ProviderTrack[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const tracks = await prisma.track.findMany({
      where: {
        OR: [
          { title: { contains: trimmed, mode: "insensitive" } },
          { album: { title: { contains: trimmed, mode: "insensitive" } } },
          { artists: { some: { artist: { name: { contains: trimmed, mode: "insensitive" } } } } },
          { genres: { some: { genre: { name: { contains: trimmed, mode: "insensitive" } } } } },
        ],
      },
      include: trackWithRelations,
      orderBy: { popularity: "desc" },
      take: 25,
    });

    return tracks.map(toDiscoveryTrack);
  }

  async getTrackById(trackId: string): Promise<ProviderTrack | null> {
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: trackWithRelations,
    });

    return track ? toDiscoveryTrack(track) : null;
  }

  async getSimilarTracks(trackId: string, limit = 6): Promise<ProviderTrack[]> {
    const source = await this.getTrackById(trackId);
    if (!source) return [];

    const clauses: Prisma.TrackWhereInput[] = [
      { language: source.language },
      ...(source.genreNames.length > 0
        ? [{ genres: { some: { genre: { name: { in: source.genreNames } } } } }]
        : []),
      ...(source.moods.length > 0 ? [{ moods: { hasSome: source.moods } }] : []),
      ...(source.activities.length > 0 ? [{ activities: { hasSome: source.activities } }] : []),
    ];

    const candidates = await prisma.track.findMany({
      where: { id: { not: trackId }, OR: clauses },
      include: trackWithRelations,
      orderBy: { popularity: "desc" },
      take: 60,
    });

    return candidates
      .map(toDiscoveryTrack)
      .map((track) => ({ track, score: similarityScore(source, track) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || b.track.popularity - a.track.popularity)
      .slice(0, limit)
      .map((entry) => entry.track);
  }
}
