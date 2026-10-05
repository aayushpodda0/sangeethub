import { prisma } from "@/lib/db/prisma";
import { buildReasons } from "@/lib/recommendations/reasons";
import type {
  RecommendationContext,
  RecommendationResult,
  RecommendationService,
} from "@/lib/recommendations/service";

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
