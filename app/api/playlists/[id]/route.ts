import { apiError, apiSuccess } from "@/lib/api/response";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getPlaylistAccess } from "@/lib/playlists/authorization";
import { updatePlaylistSchema } from "@/lib/playlists/schemas";
import { serializePlaylist } from "@/lib/playlists/serializers";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await getAuthSession();
  const userId = session?.user?.id;

  const access = await getPlaylistAccess(id, userId);
  if (!access) {
    return apiError(404, "NOT_FOUND", "Playlist not found.");
  }
  if (!access.canView) {
    return apiError(403, "FORBIDDEN", "You don't have access to this playlist.");
  }

  return apiSuccess(serializePlaylist(access, userId));
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return apiError(401, "UNAUTHENTICATED", "You need to be signed in.");
  }

  const access = await getPlaylistAccess(id, userId);
  if (!access) {
    return apiError(404, "NOT_FOUND", "Playlist not found.");
  }
  if (!access.canEditSettings) {
    return apiError(403, "FORBIDDEN", "Only the playlist owner can change these settings.");
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = updatePlaylistSchema.safeParse(json);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Invalid update", parsed.error.flatten());
  }

  try {
    const activities: { type: "RENAMED" | "COLLAB_ENABLED" | "COLLAB_DISABLED"; message: string }[] = [];
    if (parsed.data.name && parsed.data.name !== access.playlist.name) {
      activities.push({ type: "RENAMED", message: `Renamed to "${parsed.data.name}"` });
    }
    if (
      parsed.data.isCollaborative !== undefined &&
      parsed.data.isCollaborative !== access.playlist.isCollaborative
    ) {
      activities.push({
        type: parsed.data.isCollaborative ? "COLLAB_ENABLED" : "COLLAB_DISABLED",
        message: parsed.data.isCollaborative ? "Collaboration enabled" : "Collaboration disabled",
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.playlist.update({
        where: { id },
        data: {
          name: parsed.data.name,
          description: parsed.data.description,
          coverUrl: parsed.data.coverUrl,
          isPublic: parsed.data.isPublic,
          isCollaborative: parsed.data.isCollaborative,
        },
      });

      for (const activity of activities) {
        await tx.playlistActivity.create({
          data: { playlistId: id, actorId: userId, type: activity.type, message: activity.message },
        });
      }
    });

    const updatedAccess = await getPlaylistAccess(id, userId);
    return apiSuccess(serializePlaylist(updatedAccess!, userId));
  } catch (error) {
    console.error("[playlists:update] failed:", error);
    return apiError(500, "PLAYLIST_UPDATE_FAILED", "Couldn't update the playlist. Please try again.");
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return apiError(401, "UNAUTHENTICATED", "You need to be signed in.");
  }

  const access = await getPlaylistAccess(id, userId);
  if (!access) {
    return apiError(404, "NOT_FOUND", "Playlist not found.");
  }
  if (!access.isOwner) {
    return apiError(403, "FORBIDDEN", "Only the playlist owner can delete it.");
  }

  try {
    await prisma.playlist.delete({ where: { id } });
    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error("[playlists:delete] failed:", error);
    return apiError(500, "PLAYLIST_DELETE_FAILED", "Couldn't delete the playlist. Please try again.");
  }
}
