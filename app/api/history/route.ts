import { apiError, apiSuccess } from "@/lib/api/response";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) return apiError(401, "UNAUTHENTICATED", "You need to be signed in.");

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const trackId = (json as { trackId?: unknown }).trackId;
  if (typeof trackId !== "string" || !trackId) {
    return apiError(400, "VALIDATION_ERROR", "trackId is required.");
  }

  try {
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      select: {
        id: true,
        albumId: true,
        artists: { select: { artistId: true }, take: 1 },
      },
    });
    if (!track) return apiError(404, "TRACK_NOT_FOUND", "That track doesn't exist.");

    await prisma.recentlyPlayed.create({
      data: {
        userId,
        trackId: track.id,
        albumId: track.albumId,
        artistId: track.artists[0]?.artistId,
      },
    });

    return apiSuccess({ recorded: true }, 201);
  } catch (error) {
    console.error("[history:record] failed:", error);
    return apiError(500, "RECORD_FAILED", "Couldn't record playback history.");
  }
}

export async function DELETE() {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) return apiError(401, "UNAUTHENTICATED", "You need to be signed in.");

  try {
    await prisma.recentlyPlayed.deleteMany({ where: { userId } });
    return apiSuccess({ cleared: true });
  } catch (error) {
    console.error("[history:clear] failed:", error);
    return apiError(500, "CLEAR_FAILED", "Couldn't clear history. Please try again.");
  }
}
