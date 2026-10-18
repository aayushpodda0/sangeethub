import { prisma } from "@/lib/db/prisma";
import { musicService } from "@/lib/music/service";
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

    const candidates = await musicService.getRecommendationCandidates(
      {
        favoriteArtistIds: context.favoriteArtistIds,
        topGenreSlugs: context.topGenreSlugs,
        languagePreferences: context.languagePreferences,
      },
      [...excludeIds],
    );

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
