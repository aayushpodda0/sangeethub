import { apiError, apiSuccess } from "@/lib/api/response";
import { Prisma } from "@prisma/client";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getPlaylistAccess } from "@/lib/playlists/authorization";
import { smartRulesSchema, updatePlaylistSchema } from "@/lib/playlists/schemas";
import { serializePlaylist } from "@/lib/playlists/serializers";
import { refreshSmartPlaylist } from "@/lib/playlists/smart-playlists";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await getAuthSession();
  const userId = session?.user?.id;

  let access = await getPlaylistAccess(id, userId);
  if (!access) {
    return apiError(404, "NOT_FOUND", "Playlist not found.");
  }
  if (!access.canView) {
    return apiError(403, "FORBIDDEN", "You don't have access to this playlist.");
  }

  if (access.playlist.isSmart && access.isOwner) {
    try {
      await refreshSmartPlaylist(id, userId!);
      access = await getPlaylistAccess(id, userId);
      if (!access) return apiError(404, "NOT_FOUND", "Playlist not found.");
    } catch (error) {
      console.error("[playlists:refresh-smart] failed:", error);
      return apiError(500, "SMART_PLAYLIST_REFRESH_FAILED", "Couldn't refresh this smart playlist.");
    }
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

  const nextIsSmart = parsed.data.isSmart ?? access.playlist.isSmart;
  const nextRules = parsed.data.smartRules !== undefined ? parsed.data.smartRules : access.playlist.smartRules;
  if (nextIsSmart) {
    const rules = smartRulesSchema.safeParse(nextRules);
    if (!rules.success) {
      return apiError(400, "INVALID_SMART_RULES", "Smart playlists need valid rules.", rules.error.flatten());
    }
  }

  if (parsed.data.folderId) {
    const folder = await prisma.playlistFolder.findUnique({ where: { id: parsed.data.folderId } });
    if (!folder || folder.userId !== userId) {
      return apiError(400, "INVALID_FOLDER", "That folder doesn't exist or isn't yours.");
    }
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
    // Folder moves are personal organization, not collaborative activity, so they don't
    // get a PlaylistActivity entry - that feed is for things collaborators care about.

    await prisma.$transaction(async (tx) => {
      await tx.playlist.update({
        where: { id },
        data: {
          name: parsed.data.name,
          description: parsed.data.description,
          coverUrl: parsed.data.coverUrl,
          isPublic: parsed.data.isPublic,
          isCollaborative: parsed.data.isCollaborative,
          folderId: parsed.data.folderId,
          isSmart: parsed.data.isSmart,
          smartRules:
            parsed.data.isSmart === false || parsed.data.smartRules === null
              ? Prisma.JsonNull
              : parsed.data.smartRules,
        },
      });

      for (const activity of activities) {
        await tx.playlistActivity.create({
          data: { playlistId: id, actorId: userId, type: activity.type, message: activity.message },
        });
      }
    });

    if (nextIsSmart) {
      await refreshSmartPlaylist(id, userId);
    }
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
