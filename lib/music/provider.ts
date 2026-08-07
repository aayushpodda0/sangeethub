import { Activity, LanguageCode, Mood } from "@prisma/client";

export type ProviderTrack = {
  id: string;
  title: string;
  artistName: string;
  albumTitle: string;
  durationSeconds: number;
  previewUrl: string;
  artworkUrl?: string | null;
  language: LanguageCode;
  moods: Mood[];
  activities: Activity[];
  tempo: number;
  popularity: number;
};

export interface MusicProvider {
  name: string;
  searchTracks(query: string): Promise<ProviderTrack[]>;
  getTrackById(trackId: string): Promise<ProviderTrack | null>;
}

