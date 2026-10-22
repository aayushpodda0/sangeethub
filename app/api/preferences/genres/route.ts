import { apiError, apiSuccess } from "@/lib/api/response";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) return apiError(401, "UNAUTHENTICATED", "You need to be signed in.");
  try {
    const genres = await prisma.genre.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } });
    return apiSuccess({ genres });
  } catch (error) {
    console.error("[preferences:genres] failed:", error);
    return apiError(500, "GENRES_LOAD_FAILED", "Couldn't load genre options.");
  }
}
