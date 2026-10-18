import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { similarityScore } from "@/lib/music/similarity";
import {
  TrackInclude,
  type DiscoverFilters,
  type AlbumSummary,
  type ArtistSummary,
  type LanguageCount,
  type MusicAlbum,
  type MusicArtist,
  type MusicProvider,
  type ProviderTrack,
  type RecommendationCandidate,
  type TrackSummary,
  type TrackPlaybackMetadata,
} from "@/lib/music/provider";
import { toDiscoveryTrack } from "@/lib/music/serializers";

export class MusicService implements MusicProvider {
  readonly name: string = "prisma";

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
      include: TrackInclude,
      orderBy: { popularity: "desc" },
      take: 25,
    });

    return tracks.map(toDiscoveryTrack);
  }

  async getTrackById(trackId: string): Promise<ProviderTrack | null> {
    const track = await prisma.track.findUnique({ where: { id: trackId }, include: TrackInclude });
    return track ? toDiscoveryTrack(track) : null;
  }

  toDiscoveryTrack(track: Prisma.TrackGetPayload<{ include: typeof TrackInclude }>): ProviderTrack {
    return toDiscoveryTrack(track);
  }

  async getTracksByIds(trackIds: string[]): Promise<ProviderTrack[]> {
    if (trackIds.length === 0) return [];
    const tracks = await prisma.track.findMany({
      where: { id: { in: trackIds } },
      include: TrackInclude,
    });
    const byId = new Map(tracks.map((track) => [track.id, toDiscoveryTrack(track)]));
    return trackIds.flatMap((id) => {
      const track = byId.get(id);
      return track ? [track] : [];
    });
  }

  async getAlbumsByIds(albumIds: string[]): Promise<AlbumSummary[]> {
    if (albumIds.length === 0) return [];
    return prisma.album.findMany({
      where: { id: { in: albumIds } },
      include: { primaryArtist: true },
    });
  }

  async getArtistsByIds(artistIds: string[]): Promise<ArtistSummary[]> {
    if (artistIds.length === 0) return [];
    return prisma.artist.findMany({
      where: { id: { in: artistIds } },
      select: { id: true, name: true, city: true, region: true, imageUrl: true },
    });
  }

  async getTrendingTracks(limit = 8): Promise<ProviderTrack[]> {
    const tracks = await prisma.track.findMany({
      include: TrackInclude,
      orderBy: [{ popularity: "desc" }, { releaseDate: "desc" }],
      take: limit,
    });
    return tracks.map(toDiscoveryTrack);
  }

  async getFeaturedArtists(limit = 6): Promise<ArtistSummary[]> {
    return prisma.artist.findMany({
      orderBy: [{ popularity: "desc" }],
      take: limit,
      select: { id: true, name: true, city: true, region: true, imageUrl: true },
    });
  }

  async getNewReleases(limit = 6): Promise<AlbumSummary[]> {
    return prisma.album.findMany({
      include: { primaryArtist: true },
      orderBy: [{ releaseDate: "desc" }],
      take: limit,
    });
  }

  async getIndependentArtists(limit = 8): Promise<ArtistSummary[]> {
    return prisma.artist.findMany({
      where: { isIndependent: true },
      orderBy: { popularity: "desc" },
      take: limit,
      select: { id: true, name: true, city: true, region: true, imageUrl: true },
    });
  }

  async getLanguageCounts(): Promise<LanguageCount[]> {
    const counts = await prisma.track.groupBy({
      by: ["language"],
      _count: { _all: true },
      orderBy: { _count: { language: "desc" } },
    });
    return counts.map(({ language, _count }) => ({ language, count: _count._all }));
  }

  async discoverTracks(filters: DiscoverFilters, limit = 30): Promise<ProviderTrack[]> {
    const tracks = await prisma.track.findMany({
      where: {
        ...(filters.mood ? { moods: { has: filters.mood } } : {}),
        ...(filters.activity ? { activities: { has: filters.activity } } : {}),
        ...(filters.language ? { language: filters.language } : {}),
      },
      include: TrackInclude,
      orderBy: { popularity: "desc" },
      take: limit,
    });
    return tracks.map(toDiscoveryTrack);
  }

  async getAlbumById(albumId: string): Promise<MusicAlbum | null> {
    return prisma.album.findUnique({
      where: { id: albumId },
      include: {
        primaryArtist: true,
        tracks: { include: TrackInclude, orderBy: { title: "asc" } },
      },
    });
  }

  async getArtistById(artistId: string): Promise<MusicArtist | null> {
    return prisma.artist.findUnique({
      where: { id: artistId },
      include: {
        albums: { orderBy: { releaseDate: "desc" } },
        trackArtists: { include: { track: { include: TrackInclude } } },
      },
    });
  }

  async getTrackSummary(trackId: string): Promise<TrackSummary | null> {
    return prisma.track.findUnique({ where: { id: trackId }, select: { id: true, title: true } });
  }

  async getTrackPlaybackMetadata(trackId: string): Promise<TrackPlaybackMetadata | null> {
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      select: { id: true, albumId: true, artists: { select: { artistId: true }, take: 1 } },
    });
    return track ? { id: track.id, albumId: track.albumId, artistId: track.artists[0]?.artistId ?? null } : null;
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
      include: TrackInclude,
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

  async getRecommendationCandidates(
    filters: {
      favoriteArtistIds: string[];
      topGenreSlugs: string[];
      languagePreferences: ProviderTrack["language"][];
    },
    excludedTrackIds: string[],
    limit = 80,
  ): Promise<RecommendationCandidate[]> {
    const orClauses: Prisma.TrackWhereInput[] = [
      ...(filters.favoriteArtistIds.length > 0
        ? [{ artists: { some: { artistId: { in: filters.favoriteArtistIds } } } }]
        : []),
      ...(filters.topGenreSlugs.length > 0
        ? [{ genres: { some: { genre: { slug: { in: filters.topGenreSlugs } } } } }]
        : []),
      ...(filters.languagePreferences.length > 0 ? [{ language: { in: filters.languagePreferences } }] : []),
      { popularity: { gte: 70 } },
    ];
    const tracks = await prisma.track.findMany({
      where: { id: { notIn: excludedTrackIds }, OR: orClauses },
      include: TrackInclude,
      take: limit,
    });
    return tracks;
  }
}

export const musicService = new MusicService();
