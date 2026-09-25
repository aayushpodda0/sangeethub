import { apiError, apiSuccess } from "@/lib/api/response";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type RouteParams = { params: Promise<{ artistId: string }> };

export async function PUT(_request: Request, { params }: RouteParams) {
  const { artistId } = await params;
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) return apiError(401, "UNAUTHENTICATED", "You need to be signed in.");

  try {
    await prisma.followedArtist.upsert({
      where: { userId_artistId: { userId, artistId } },
      create: { userId, artistId },
      update: {},
    });
    return apiSuccess({ following: true });
  } catch (error) {
    console.error("[favorites:artist:follow] failed:", error);
    return apiError(500, "FOLLOW_FAILED", "Couldn't follow this artist. Please try again.");
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { artistId } = await params;
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) return apiError(401, "UNAUTHENTICATED", "You need to be signed in.");

  try {
    await prisma.followedArtist.deleteMany({ where: { userId, artistId } });
    return apiSuccess({ following: false });
  } catch (error) {
    console.error("[favorites:artist:unfollow] failed:", error);
    return apiError(500, "UNFOLLOW_FAILED", "Couldn't unfollow this artist. Please try again.");
  }
}
