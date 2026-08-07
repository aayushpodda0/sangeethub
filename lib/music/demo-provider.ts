import { prisma } from "@/lib/db/prisma";
import type { MusicProvider, ProviderTrack } from "@/lib/music/provider";

export class DemoMusicProvider implements MusicProvider {
  readonly name = "demo";

  async searchTracks(query: string): Promise<ProviderTrack[]> {
    const tracks = await prisma.track.findMany({
      where: {
        title: {
          contains: query,
          mode: "insensitive",
        },
      },
      include: {
        album: true,
        artists: {
          include: {
            artist: true,
          },
        },
      },
      take: 20,
    });

    return tracks.map((track) => ({
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
    }));
  }

  async getTrackById(trackId: string): Promise<ProviderTrack | null> {
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: {
        album: true,
        artists: {
          include: {
            artist: true,
          },
        },
      },
    });

    if (!track) {
      return null;
    }

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
}

