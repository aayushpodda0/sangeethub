import { apiError, apiSuccess } from "@/lib/api/response";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getPlaylistAccess } from "@/lib/playlists/authorization";
import { reorderTracksSchema } from "@/lib/playlists/schemas";

type RouteParams = { params: Promise<{ id: string }> };

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
  if (!access.canReorder) {
    return apiError(403, "FORBIDDEN", "You don't have permission to reorder this playlist.");
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = reorderTracksSchema.safeParse(json);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Invalid order", parsed.error.flatten());
  }

  const existingIds = new Set(access.playlist.tracks.map((t) => t.id));
  const providedIds = parsed.data.orderedPlaylistTrackIds;

  if (providedIds.length !== existingIds.size || !providedIds.every((tid) => existingIds.has(tid))) {
    return apiError(
      400,
      "ORDER_MISMATCH",
      "The provided track order doesn't match the playlist's current tracks.",
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Two-pass update avoids unique(playlistId, position) collisions mid-transaction.
      await Promise.all(
        providedIds.map((trackEntryId, index) =>
          tx.playlistTrack.update({
            where: { id: trackEntryId },
            data: { position: index + 10_000 },
          }),
        ),
      );
      await Promise.all(
        providedIds.map((trackEntryId, index) =>
          tx.playlistTrack.update({
            where: { id: trackEntryId },
            data: { position: index },
          }),
        ),
      );

      await tx.playlistActivity.create({
        data: {
          playlistId: id,
          actorId: userId,
          type: "REORDERED",
          message: "Reordered tracks",
        },
      });
    });

    return apiSuccess({ reordered: true });
  } catch (error) {
    console.error("[playlists:reorder] failed:", error);
    return apiError(500, "REORDER_FAILED", "Couldn't reorder tracks. Please try again.");
  }
}
