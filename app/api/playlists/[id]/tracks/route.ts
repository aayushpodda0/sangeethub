import { apiError, apiSuccess } from "@/lib/api/response";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getPlaylistAccess } from "@/lib/playlists/authorization";
import { addTrackSchema } from "@/lib/playlists/schemas";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
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
  if (!access.canAddTrack) {
    return apiError(403, "FORBIDDEN", "You don't have permission to add tracks to this playlist.");
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = addTrackSchema.safeParse(json);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Invalid track", parsed.error.flatten());
  }

  try {
    const track = await prisma.track.findUnique({
      where: { id: parsed.data.trackId },
      select: { id: true, title: true },
    });
    if (!track) {
      return apiError(404, "TRACK_NOT_FOUND", "That track doesn't exist.");
    }

    const alreadyInPlaylist = access.playlist.tracks.some((entry) => entry.trackId === track.id);
    if (alreadyInPlaylist) {
      return apiError(409, "DUPLICATE_TRACK", "This track is already in the playlist.");
    }

    const nextPosition = access.playlist.tracks.length;

    await prisma.$transaction(async (tx) => {
      await tx.playlistTrack.create({
        data: {
          playlistId: id,
          trackId: track.id,
          addedById: userId,
          position: nextPosition,
        },
      });

      await tx.playlistActivity.create({
        data: {
          playlistId: id,
          actorId: userId,
          type: "TRACK_ADDED",
          message: `Added "${track.title}"`,
        },
      });
    });

    return apiSuccess({ added: true }, 201);
  } catch (error) {
    console.error("[playlists:add-track] failed:", error);
    return apiError(500, "ADD_TRACK_FAILED", "Couldn't add the track. Please try again.");
  }
}
