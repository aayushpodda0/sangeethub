import { Activity, LanguageCode, Mood } from "@prisma/client";

export type RecommendationExplanation = {
  code:
    | "FAVORITE_ARTIST"
    | "FREQUENT_GENRE"
    | "SIMILAR_LISTENERS"
    | "NEW_RELEASE"
    | "MOOD_MATCH"
    | "ACTIVITY_MATCH";
  title: string;
  detail: string;
};

export type RecommendationResult = {
  trackId: string;
  score: number;
  explanation: RecommendationExplanation;
};

export type RecommendationContext = {
  userId: string;
  favoriteArtistIds: string[];
  topGenreSlugs: string[];
  languagePreferences: LanguageCode[];
  moodPreferences: Mood[];
  activityPreferences: Activity[];
};

export interface RecommendationService {
  getTrackRecommendations(context: RecommendationContext): Promise<RecommendationResult[]>;
}

