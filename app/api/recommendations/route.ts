import { apiError, apiSuccess } from "@/lib/api/response";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { toDiscoveryTrack } from "@/lib/music/serializers";
import { buildRecommendationContext } from "@/lib/recommendations/context";
import { DeterministicRecommendationService } from "@/lib/recommendations/deterministic-service";

const service = new DeterministicRecommendationService();

export async function GET() {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return apiError(401, "UNAUTHENTICATED", "You need to be signed in to get recommendations.");
  }

  try {
    const context = await buildRecommendationContext(userId);
    const results = await service.getTrackRecommendations(context);

    if (results.length === 0) {
      return apiSuccess({ recommendations: [] });
    }

    const tracks = await prisma.track.findMany({
      where: { id: { in: results.map((r) => r.trackId) } },
      include: {
        album: true,
        artists: { include: { artist: true } },
        genres: { include: { genre: true } },
      },
    });
    const trackById = new Map(tracks.map((t) => [t.id, t]));

    const recommendations = results
      .map((result) => {
        const track = trackById.get(result.trackId);
        if (!track) return null;
        return {
          track: toDiscoveryTrack(track),
          score: result.score,
          explanation: result.explanation,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    return apiSuccess({ recommendations });
  } catch (error) {
    console.error("[recommendations] failed:", error);
    return apiError(500, "RECOMMENDATIONS_FAILED", "Couldn't load recommendations. Please try again.");
  }
}
