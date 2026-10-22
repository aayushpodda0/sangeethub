import type { LanguageCode, Mood } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { PreferenceInput } from "@/lib/preferences/schemas";

export type UserMusicPreference = {
  languages: LanguageCode[];
  genres: string[];
  moods: Mood[];
  onboardingCompleted: boolean;
  onboardingSkipped: boolean;
};

const emptyPreferences: UserMusicPreference = {
  languages: [],
  genres: [],
  moods: [],
  onboardingCompleted: false,
  onboardingSkipped: false,
};

export async function getUserMusicPreferences(userId: string): Promise<UserMusicPreference> {
  const preferences = await prisma.userMusicPreferences.findUnique({ where: { userId } });
  if (!preferences) return emptyPreferences;
  return {
    languages: preferences.languages,
    genres: preferences.genres,
    moods: preferences.moods,
    onboardingCompleted: preferences.onboardingCompleted,
    onboardingSkipped: preferences.onboardingSkipped,
  };
}

export async function saveUserMusicPreferences(
  userId: string,
  input: PreferenceInput,
): Promise<UserMusicPreference> {
  const saved = await prisma.userMusicPreferences.upsert({
    where: { userId },
    create: {
      userId,
      languages: input.languages,
      genres: input.genres,
      moods: input.moods,
      onboardingCompleted: input.onboardingCompleted ?? true,
      onboardingSkipped: input.onboardingSkipped ?? false,
    },
    update: {
      languages: input.languages,
      genres: input.genres,
      moods: input.moods,
      onboardingCompleted: input.onboardingCompleted ?? true,
      onboardingSkipped: input.onboardingSkipped ?? false,
    },
  });
  return {
    languages: saved.languages,
    genres: saved.genres,
    moods: saved.moods,
    onboardingCompleted: saved.onboardingCompleted,
    onboardingSkipped: saved.onboardingSkipped,
  };
}

export async function skipUserMusicOnboarding(userId: string): Promise<UserMusicPreference> {
  return saveUserMusicPreferences(userId, {
    languages: [],
    genres: [],
    moods: [],
    onboardingCompleted: false,
    onboardingSkipped: true,
  });
}
