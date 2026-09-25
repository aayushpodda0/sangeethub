import { apiError, apiSuccess } from "@/lib/api/response";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createPlaylistSchema } from "@/lib/playlists/schemas";

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "playlist"
  );
}

async function ensureUniqueSlug(base: string) {
  const existing = await prisma.playlist.findUnique({ where: { slug: base } });
  if (!existing) return base;

  for (let i = 1; i <= 1000; i += 1) {
    const candidate = `${base}-${i}`;
    const collision = await prisma.playlist.findUnique({ where: { slug: candidate } });
    if (!collision) return candidate;
  }

  throw new Error("Could not generate a unique playlist slug");
}

export async function GET() {
  const session = await getAuthSession();
  const userId = session?.user?.id;

  try {
    const playlists = await prisma.playlist.findMany({
      where: userId
        ? { OR: [{ ownerId: userId }, { isPublic: true }, { collaborations: { some: { userId } } }] }
        : { isPublic: true },
      include: {
        owner: { select: { id: true, name: true, username: true } },
        _count: { select: { tracks: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    return apiSuccess({
      playlists: playlists.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        coverUrl: p.coverUrl,
        isPublic: p.isPublic,
        isCollaborative: p.isCollaborative,
        trackCount: p._count.tracks,
        owner: p.owner,
        isMine: userId === p.ownerId,
      })),
    });
  } catch (error) {
    console.error("[playlists:list] failed:", error);
    return apiError(500, "PLAYLISTS_LIST_FAILED", "Couldn't load playlists. Please try again.");
  }
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return apiError(401, "UNAUTHENTICATED", "You need to be signed in to create a playlist.");
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = createPlaylistSchema.safeParse(json);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Invalid playlist details", parsed.error.flatten());
  }

  try {
    const slug = await ensureUniqueSlug(slugify(parsed.data.name));

    const playlist = await prisma.$transaction(async (tx) => {
      const created = await tx.playlist.create({
        data: {
          ownerId: userId,
          name: parsed.data.name,
          description: parsed.data.description || null,
          isPublic: parsed.data.isPublic ?? false,
          slug,
        },
      });

      await tx.playlistActivity.create({
        data: {
          playlistId: created.id,
          actorId: userId,
          type: "CREATED",
          message: "Playlist created",
        },
      });

      return created;
    });

    return apiSuccess({ id: playlist.id, slug: playlist.slug }, 201);
  } catch (error) {
    console.error("[playlists:create] failed:", error);
    return apiError(500, "PLAYLIST_CREATE_FAILED", "Couldn't create the playlist. Please try again.");
  }
}
