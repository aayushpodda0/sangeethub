import { prisma } from "@/lib/db/prisma";
import type {
  RecommendationContext,
  RecommendationExplanation,
  RecommendationResult,
  RecommendationService,
} from "@/lib/recommendations/service";

const NEW_RELEASE_WINDOW_DAYS = 60;

type ScoredReason = { explanation: RecommendationExplanation; weight: number };

function buildReasons(
  track: {
    id: string;
    title: string;
    language: string;
    moods: string[];
    activities: string[];
    popularity: number;
    album: { releaseDate: Date };
    artists: { artistId: string; artist: { name: string } }[];
    genres: { genre: { slug: string; name: string } }[];
  },
  context: RecommendationContext,
): ScoredReason[] {
  const reasons: ScoredReason[] = [];

  const favoriteArtist = track.artists.find((a) => context.favoriteArtistIds.includes(a.artistId));
  if (favoriteArtist) {
    const isNewRelease =
      Date.now() - track.album.releaseDate.getTime() < NEW_RELEASE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    if (isNewRelease) {
      reasons.push({
        weight: 45,
        explanation: {
          code: "NEW_RELEASE",
          title: "New release from an artist you follow",
          detail: `${favoriteArtist.artist.name} just released this.`,
        },
      });
    } else {
      reasons.push({
        weight: 40,
        explanation: {
          code: "FAVORITE_ARTIST",
          title: "Because you listen to this artist",
          detail: `You've liked or followed ${favoriteArtist.artist.name} before.`,
        },
      });
    }
  }

  const matchedGenre = track.genres.find((g) => context.topGenreSlugs.includes(g.genre.slug));
  if (matchedGenre) {
    reasons.push({
      weight: 25,
      explanation: {
        code: "FREQUENT_GENRE",
        title: "Matches a genre you listen to often",
        detail: `You've been playing a lot of ${matchedGenre.genre.name} lately.`,
      },
    });
  }

  const matchedMood = track.moods.find((m) => context.moodPreferences.includes(m as never));
  if (matchedMood) {
    reasons.push({
      weight: 20,
      explanation: {
        code: "MOOD_MATCH",
        title: "Matches your selected mood",
        detail: `Fits the ${matchedMood.toLowerCase()} mood you've been listening to.`,
      },
    });
  }

  const matchedActivity = track.activities.find((a) => context.activityPreferences.includes(a as never));
  if (matchedActivity) {
    reasons.push({
      weight: 20,
      explanation: {
        code: "ACTIVITY_MATCH",
        title: "Matches your listening activity",
        detail: `Good fit for ${matchedActivity.toLowerCase()} based on your history.`,
      },
    });
  }

  // Language preference isn't one of the defined explanation codes, so it only
  // contributes a flat score bump (applied by the caller) rather than its own reason.

  reasons.push({
    weight: Math.round(track.popularity / 10),
    explanation: {
      code: "SIMILAR_LISTENERS",
      title: "Popular among listeners with similar preferences",
      detail: "Trending with people who listen to similar music.",
    },
  });

  return reasons;
}

export class DeterministicRecommendationService implements RecommendationService {
  async getTrackRecommendations(context: RecommendationContext): Promise<RecommendationResult[]> {
    const alreadyLiked = await prisma.favoriteTrack.findMany({
      where: { userId: context.userId },
      select: { trackId: true },
    });
    const excludeIds = new Set(alreadyLiked.map((f) => f.trackId));

    const orClauses = [
      context.favoriteArtistIds.length > 0
        ? { artists: { some: { artistId: { in: context.favoriteArtistIds } } } }
        : null,
      context.topGenreSlugs.length > 0
        ? { genres: { some: { genre: { slug: { in: context.topGenreSlugs } } } } }
        : null,
      context.languagePreferences.length > 0 ? { language: { in: context.languagePreferences } } : null,
      { popularity: { gte: 70 } },
    ].filter((clause): clause is NonNullable<typeof clause> => clause !== null);

    const candidates = await prisma.track.findMany({
      where: {
        id: { notIn: [...excludeIds] },
        OR: orClauses,
      },
      include: {
        album: true,
        artists: { include: { artist: true } },
        genres: { include: { genre: true } },
      },
      take: 80,
    });

    const scored = candidates.map((track) => {
      const reasons = buildReasons(track, context);
      const languageBonus = context.languagePreferences.includes(track.language) ? 8 : 0;
      const totalScore = reasons.reduce((sum, r) => sum + r.weight, 0) + languageBonus;
      const bestReason = reasons.reduce((best, r) => (r.weight > best.weight ? r : best), reasons[0]);

      return {
        trackId: track.id,
        score: totalScore,
        explanation: bestReason.explanation,
      };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, 12);
  }
}
