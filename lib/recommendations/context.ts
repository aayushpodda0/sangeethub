import { prisma } from "@/lib/db/prisma";
import type { RecommendationContext } from "@/lib/recommendations/service";
import type { Activity, LanguageCode, Mood } from "@prisma/client";

function topN<T extends string>(counts: Map<T, number>, n: number): T[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key]) => key);
}

function bump<T extends string>(counts: Map<T, number>, values: T[]) {
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
}

export async function buildRecommendationContext(userId: string): Promise<RecommendationContext> {
  const [followedArtists, favoriteTracks, recentlyPlayed] = await Promise.all([
    prisma.followedArtist.findMany({ where: { userId }, select: { artistId: true } }),
    prisma.favoriteTrack.findMany({
      where: { userId },
      select: {
        track: {
          select: {
            language: true,
            moods: true,
            activities: true,
            artists: { select: { artistId: true } },
            genres: { select: { genre: { select: { slug: true } } } },
          },
        },
      },
    }),
    prisma.recentlyPlayed.findMany({
      where: { userId },
      orderBy: { playedAt: "desc" },
      take: 100,
      select: {
        track: {
          select: {
            language: true,
            moods: true,
            activities: true,
            genres: { select: { genre: { select: { slug: true } } } },
          },
        },
      },
    }),
  ]);

  const genreCounts = new Map<string, number>();
  const languageCounts = new Map<LanguageCode, number>();
  const moodCounts = new Map<Mood, number>();
  const activityCounts = new Map<Activity, number>();
  const favoriteArtistIds = new Set(followedArtists.map((f) => f.artistId));

  for (const { track } of favoriteTracks) {
    bump(
      genreCounts,
      track.genres.map((g) => g.genre.slug),
    );
    bump(languageCounts, [track.language]);
    bump(moodCounts, track.moods);
    bump(activityCounts, track.activities);
    for (const a of track.artists) favoriteArtistIds.add(a.artistId);
  }

  for (const { track } of recentlyPlayed) {
    bump(
      genreCounts,
      track.genres.map((g) => g.genre.slug),
    );
    bump(languageCounts, [track.language]);
    bump(moodCounts, track.moods);
    bump(activityCounts, track.activities);
  }

  return {
    userId,
    favoriteArtistIds: [...favoriteArtistIds],
    topGenreSlugs: topN(genreCounts, 5),
    languagePreferences: topN(languageCounts, 3),
    moodPreferences: topN(moodCounts, 3),
    activityPreferences: topN(activityCounts, 3),
  };
}
