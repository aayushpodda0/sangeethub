import { apiError, apiSuccess } from "@/lib/api/response";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createFolderSchema } from "@/lib/playlists/folder-schemas";

export async function GET() {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return apiError(401, "UNAUTHENTICATED", "You need to be signed in.");
  }

  try {
    const folders = await prisma.playlistFolder.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      include: { _count: { select: { playlists: true } } },
    });

    return apiSuccess({
      folders: folders.map((f) => ({ id: f.id, name: f.name, playlistCount: f._count.playlists })),
    });
  } catch (error) {
    console.error("[playlist-folders:list] failed:", error);
    return apiError(500, "FOLDERS_LIST_FAILED", "Couldn't load your folders. Please try again.");
  }
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return apiError(401, "UNAUTHENTICATED", "You need to be signed in.");
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = createFolderSchema.safeParse(json);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Invalid folder name", parsed.error.flatten());
  }

  try {
    const folder = await prisma.playlistFolder.create({
      data: { userId, name: parsed.data.name.trim() },
    });
    return apiSuccess({ id: folder.id, name: folder.name, playlistCount: 0 }, 201);
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return apiError(409, "FOLDER_NAME_TAKEN", "You already have a folder with that name.");
    }
    console.error("[playlist-folders:create] failed:", error);
    return apiError(500, "FOLDER_CREATE_FAILED", "Couldn't create the folder. Please try again.");
  }
}
