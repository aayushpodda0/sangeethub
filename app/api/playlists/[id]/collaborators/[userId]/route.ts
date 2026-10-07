import { apiError, apiSuccess } from "@/lib/api/response";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getPlaylistAccess } from "@/lib/playlists/authorization";
import { updateCollaboratorSchema } from "@/lib/playlists/schemas";

type RouteParams = { params: Promise<{ id: string; userId: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id, userId: collaboratorId } = await params;
  const session = await getAuthSession();
  const requesterId = session?.user?.id;
  if (!requesterId) {
    return apiError(401, "UNAUTHENTICATED", "You need to be signed in.");
  }

  const access = await getPlaylistAccess(id, requesterId);
  if (!access) {
    return apiError(404, "NOT_FOUND", "Playlist not found.");
  }
  if (!access.isOwner) {
    return apiError(403, "FORBIDDEN", "Only the playlist owner can manage collaborators.");
  }

  const collaboration = access.playlist.collaborations.find((c) => c.userId === collaboratorId);
  if (!collaboration) {
    return apiError(404, "COLLABORATOR_NOT_FOUND", "That person isn't a collaborator on this playlist.");
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = updateCollaboratorSchema.safeParse(json);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Invalid update", parsed.error.flatten());
  }
  if (parsed.data.permission === undefined && parsed.data.canRemoveOthers === undefined) {
    return apiError(400, "VALIDATION_ERROR", "Nothing to update.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.playlistCollaboration.update({
        where: { playlistId_userId: { playlistId: id, userId: collaboratorId } },
        data: {
          permission: parsed.data.permission,
          canRemoveOthers: parsed.data.canRemoveOthers,
        },
      });

      await tx.playlistActivity.create({
        data: {
          playlistId: id,
          actorId: requesterId,
          type: "COLLABORATOR_PERMISSION_CHANGED",
          message: `changed ${collaboration.user.name ?? collaboration.user.username}'s permissions`,
        },
      });
    });

    return apiSuccess({ updated: true });
  } catch (error) {
    console.error("[playlists:collaborators:update] failed:", error);
    return apiError(500, "COLLABORATOR_UPDATE_FAILED", "Couldn't update this collaborator. Please try again.");
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id, userId: collaboratorId } = await params;
  const session = await getAuthSession();
  const requesterId = session?.user?.id;
  if (!requesterId) {
    return apiError(401, "UNAUTHENTICATED", "You need to be signed in.");
  }

  const access = await getPlaylistAccess(id, requesterId);
  if (!access) {
    return apiError(404, "NOT_FOUND", "Playlist not found.");
  }
  if (!access.isOwner) {
    return apiError(403, "FORBIDDEN", "Only the playlist owner can remove collaborators.");
  }

  const collaboration = access.playlist.collaborations.find((c) => c.userId === collaboratorId);
  if (!collaboration) {
    return apiError(404, "COLLABORATOR_NOT_FOUND", "That person isn't a collaborator on this playlist.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.playlistCollaboration.delete({
        where: { playlistId_userId: { playlistId: id, userId: collaboratorId } },
      });

      await tx.playlistActivity.create({
        data: {
          playlistId: id,
          actorId: requesterId,
          type: "COLLABORATOR_REMOVED",
          message: `removed ${collaboration.user.name ?? collaboration.user.username} as a collaborator`,
        },
      });
    });

    return apiSuccess({ removed: true });
  } catch (error) {
    console.error("[playlists:collaborators:remove] failed:", error);
    return apiError(500, "COLLABORATOR_REMOVE_FAILED", "Couldn't remove this collaborator. Please try again.");
  }
}
