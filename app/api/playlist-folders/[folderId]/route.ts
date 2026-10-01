import { apiError, apiSuccess } from "@/lib/api/response";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { renameFolderSchema } from "@/lib/playlists/folder-schemas";

type RouteParams = { params: Promise<{ folderId: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const { folderId } = await params;
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return apiError(401, "UNAUTHENTICATED", "You need to be signed in.");
  }

  const folder = await prisma.playlistFolder.findUnique({ where: { id: folderId } });
  if (!folder) {
    return apiError(404, "NOT_FOUND", "Folder not found.");
  }
  if (folder.userId !== userId) {
    return apiError(403, "FORBIDDEN", "You don't have permission to rename this folder.");
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = renameFolderSchema.safeParse(json);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Invalid folder name", parsed.error.flatten());
  }

  try {
    const updated = await prisma.playlistFolder.update({
      where: { id: folderId },
      data: { name: parsed.data.name.trim() },
    });
    return apiSuccess({ id: updated.id, name: updated.name });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return apiError(409, "FOLDER_NAME_TAKEN", "You already have a folder with that name.");
    }
    console.error("[playlist-folders:rename] failed:", error);
    return apiError(500, "FOLDER_RENAME_FAILED", "Couldn't rename the folder. Please try again.");
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { folderId } = await params;
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return apiError(401, "UNAUTHENTICATED", "You need to be signed in.");
  }

  const folder = await prisma.playlistFolder.findUnique({ where: { id: folderId } });
  if (!folder) {
    return apiError(404, "NOT_FOUND", "Folder not found.");
  }
  if (folder.userId !== userId) {
    return apiError(403, "FORBIDDEN", "You don't have permission to delete this folder.");
  }

  try {
    // Playlists inside are unassigned (folderId -> null) automatically via the schema's
    // onDelete: SetNull - they are never deleted along with the folder.
    await prisma.playlistFolder.delete({ where: { id: folderId } });
    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error("[playlist-folders:delete] failed:", error);
    return apiError(500, "FOLDER_DELETE_FAILED", "Couldn't delete the folder. Please try again.");
  }
}
