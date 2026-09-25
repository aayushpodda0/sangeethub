import { apiError, apiSuccess } from "@/lib/api/response";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type RouteParams = { params: Promise<{ albumId: string }> };

export async function PUT(_request: Request, { params }: RouteParams) {
  const { albumId } = await params;
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) return apiError(401, "UNAUTHENTICATED", "You need to be signed in.");

  try {
    await prisma.savedAlbum.upsert({
      where: { userId_albumId: { userId, albumId } },
      create: { userId, albumId },
      update: {},
    });
    return apiSuccess({ saved: true });
  } catch (error) {
    console.error("[favorites:album:save] failed:", error);
    return apiError(500, "SAVE_FAILED", "Couldn't save this album. Please try again.");
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { albumId } = await params;
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) return apiError(401, "UNAUTHENTICATED", "You need to be signed in.");

  try {
    await prisma.savedAlbum.deleteMany({ where: { userId, albumId } });
    return apiSuccess({ saved: false });
  } catch (error) {
    console.error("[favorites:album:unsave] failed:", error);
    return apiError(500, "UNSAVE_FAILED", "Couldn't unsave this album. Please try again.");
  }
}
