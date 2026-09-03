import { Activity, LanguageCode, Mood } from "@prisma/client";

export type PlayerTrack = {
  id: string;
  title: string;
  artistNames: string[];
  albumTitle: string;
  artworkUrl: string | null;
  previewUrl: string;
  durationSeconds: number;
  language: LanguageCode;
  moods: Mood[];
  activities: Activity[];
};

export type DiscoveryTrack = PlayerTrack & {
  popularity: number;
  genreNames: string[];
};

