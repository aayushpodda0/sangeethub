import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { toDiscoveryTrack } from "@/lib/music/serializers";
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
}
