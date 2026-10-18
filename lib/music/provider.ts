import type { Activity, LanguageCode, Mood, Prisma } from "@prisma/client";
import type { DiscoveryTrack } from "@/types/music";

export type ProviderTrack = DiscoveryTrack;
export type TrackSummary = Pick<ProviderTrack, "id" | "title">;
export type ArtistSummary = {
  id: string;
  name: string;
  city: string | null;
  region: string | null;
  imageUrl: string | null;
};
export type TrackPlaybackMetadata = { id: string; albumId: string; artistId: string | null };
export type AlbumSummary = Prisma.AlbumGetPayload<{ include: { primaryArtist: true } }>;
export type LanguageCount = { language: LanguageCode; count: number };

export type DiscoverFilters = {
  mood?: Mood;
  activity?: Activity;
  language?: LanguageCode;
};

export const TrackInclude = {
  album: true,
  artists: { include: { artist: true } },
  genres: { include: { genre: true } },
} satisfies Prisma.TrackInclude;
export type RecommendationCandidate = Prisma.TrackGetPayload<{ include: typeof TrackInclude }>;

export type MusicAlbum = Prisma.AlbumGetPayload<{
  include: { primaryArtist: true; tracks: { include: typeof TrackInclude } };
}>;
export type MusicArtist = Prisma.ArtistGetPayload<{
  include: { albums: true; trackArtists: { include: { track: { include: typeof TrackInclude } } } };
}>;

export interface MusicProvider {
  name: string;
  searchTracks(query: string): Promise<ProviderTrack[]>;
  getTrackById(trackId: string): Promise<ProviderTrack | null>;
  /** Tracks most alike `trackId` (never includes the track itself), best first. */
  getSimilarTracks(trackId: string, limit?: number): Promise<ProviderTrack[]>;
  getTracksByIds(trackIds: string[]): Promise<ProviderTrack[]>;
  getAlbumsByIds(albumIds: string[]): Promise<AlbumSummary[]>;
  getArtistsByIds(artistIds: string[]): Promise<ArtistSummary[]>;
  getTrackPlaybackMetadata(trackId: string): Promise<TrackPlaybackMetadata | null>;
  getTrendingTracks(limit?: number): Promise<ProviderTrack[]>;
  getFeaturedArtists(limit?: number): Promise<ArtistSummary[]>;
  getNewReleases(limit?: number): Promise<AlbumSummary[]>;
  getIndependentArtists(limit?: number): Promise<ArtistSummary[]>;
  getLanguageCounts(): Promise<LanguageCount[]>;
  discoverTracks(filters: DiscoverFilters, limit?: number): Promise<ProviderTrack[]>;
  getAlbumById(albumId: string): Promise<MusicAlbum | null>;
  getArtistById(artistId: string): Promise<MusicArtist | null>;
  getTrackSummary(trackId: string): Promise<TrackSummary | null>;
  getRecommendationCandidates(
    filters: {
      favoriteArtistIds: string[];
      topGenreSlugs: string[];
      languagePreferences: LanguageCode[];
    },
    excludedTrackIds: string[],
    limit?: number,
  ): Promise<RecommendationCandidate[]>;
}
