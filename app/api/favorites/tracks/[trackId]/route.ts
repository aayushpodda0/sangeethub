import { apiError, apiSuccess } from "@/lib/api/response";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type RouteParams = { params: Promise<{ trackId: string }> };

export async function PUT(_request: Request, { params }: RouteParams) {
  const { trackId } = await params;
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) return apiError(401, "UNAUTHENTICATED", "You need to be signed in.");

  try {
    await prisma.favoriteTrack.upsert({
      where: { userId_trackId: { userId, trackId } },
      create: { userId, trackId },
      update: {},
    });
    return apiSuccess({ liked: true });
  } catch (error) {
    console.error("[favorites:track:like] failed:", error);
    return apiError(500, "LIKE_FAILED", "Couldn't like this track. Please try again.");
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { trackId } = await params;
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) return apiError(401, "UNAUTHENTICATED", "You need to be signed in.");

  try {
    await prisma.favoriteTrack.deleteMany({ where: { userId, trackId } });
    return apiSuccess({ liked: false });
  } catch (error) {
    console.error("[favorites:track:unlike] failed:", error);
    return apiError(500, "UNLIKE_FAILED", "Couldn't unlike this track. Please try again.");
  }
}
