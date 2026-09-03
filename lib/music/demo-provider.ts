import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { MusicProvider, ProviderTrack } from "@/lib/music/provider";

type TrackWithRelations = Prisma.TrackGetPayload<{
  include: {
    album: true;
    artists: { include: { artist: true } };
  };
}>;

function toProviderTrack(track: TrackWithRelations): ProviderTrack {
  return {
    id: track.id,
    title: track.title,
    artistName: track.artists.map((entry) => entry.artist.name).join(", "),
    albumTitle: track.album.title,
    durationSeconds: track.durationSeconds,
    previewUrl: track.previewUrl,
    artworkUrl: track.artworkUrl,
    language: track.language,
    moods: track.moods,
    activities: track.activities,
    tempo: track.tempo,
    popularity: track.popularity,
  };
}

const trackWithRelations = {
  album: true,
  artists: {
    include: {
      artist: true,
    },
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

    return tracks.map(toProviderTrack);
  }

  async getTrackById(trackId: string): Promise<ProviderTrack | null> {
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: trackWithRelations,
    });

    return track ? toProviderTrack(track) : null;
  }
}
