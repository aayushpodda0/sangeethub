import { apiError, apiSuccess } from "@/lib/api/response";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getPlaylistAccess } from "@/lib/playlists/authorization";

type RouteParams = { params: Promise<{ id: string; playlistTrackId: string }> };

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id, playlistTrackId } = await params;
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return apiError(401, "UNAUTHENTICATED", "You need to be signed in.");
  }

  const access = await getPlaylistAccess(id, userId);
  if (!access) {
    return apiError(404, "NOT_FOUND", "Playlist not found.");
  }

  const entry = access.playlist.tracks.find((t) => t.id === playlistTrackId);
  if (!entry) {
    return apiError(404, "TRACK_ENTRY_NOT_FOUND", "That track isn't in this playlist.");
  }

  if (!access.canRemoveTrack(entry.addedById)) {
    return apiError(
      403,
      "FORBIDDEN",
      "You can only remove tracks you added, unless you have moderator permission.",
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.playlistTrack.delete({ where: { id: playlistTrackId } });

      // Re-pack positions so there are no gaps.
      const remaining = await tx.playlistTrack.findMany({
        where: { playlistId: id },
        orderBy: { position: "asc" },
      });
      await Promise.all(
        remaining.map((t, index) =>
          t.position === index
            ? Promise.resolve()
            : tx.playlistTrack.update({ where: { id: t.id }, data: { position: index } }),
        ),
      );

      await tx.playlistActivity.create({
        data: {
          playlistId: id,
          actorId: userId,
          type: "TRACK_REMOVED",
          message: `Removed "${entry.track.title}"`,
        },
      });
    });

    return apiSuccess({ removed: true });
  } catch (error) {
    console.error("[playlists:remove-track] failed:", error);
    return apiError(500, "REMOVE_TRACK_FAILED", "Couldn't remove the track. Please try again.");
  }
}
