import { prisma } from "@/lib/db/prisma";

export type PlaylistAccess = {
  playlist: NonNullable<Awaited<ReturnType<typeof loadPlaylist>>>;
  isOwner: boolean;
  collaboration: { permission: "CONTRIBUTOR" | "MODERATOR"; canRemoveOthers: boolean } | null;
  canView: boolean;
  canEditSettings: boolean;
  canAddTrack: boolean;
  canReorder: boolean;
  canInvite: boolean;
  canRemoveTrack: (addedById: string) => boolean;
};

function loadPlaylist(playlistId: string) {
  return prisma.playlist.findUnique({
    where: { id: playlistId },
    include: {
      owner: { select: { id: true, name: true, username: true } },
      collaborations: {
        include: { user: { select: { id: true, name: true, username: true } } },
      },
      tracks: {
        orderBy: { position: "asc" },
        include: {
          addedBy: { select: { id: true, name: true, username: true } },
          track: {
            include: {
              album: true,
              artists: { include: { artist: true } },
              genres: { include: { genre: true } },
            },
          },
        },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { actor: { select: { id: true, name: true, username: true } } },
      },
    },
  });
}

/**
 * Loads a playlist and computes the current user's access to it. Returns null if the
 * playlist doesn't exist. All authorization decisions live here so every route agrees
 * on the same rules instead of re-implementing them.
 */
export async function getPlaylistAccess(
  playlistId: string,
  userId: string | undefined,
): Promise<PlaylistAccess | null> {
  const playlist = await loadPlaylist(playlistId);
  if (!playlist) return null;

  const isOwner = userId !== undefined && playlist.ownerId === userId;
  const collaborationRow = userId
    ? playlist.collaborations.find((c) => c.userId === userId)
    : undefined;
  const collaboration = collaborationRow
    ? { permission: collaborationRow.permission, canRemoveOthers: collaborationRow.canRemoveOthers }
    : null;

  const isCollaborator = collaboration !== null;
  const canView = playlist.isPublic || isOwner || isCollaborator;
  const canAddTrack = isOwner || (playlist.isCollaborative && isCollaborator);

  return {
    playlist,
    isOwner,
    collaboration,
    canView,
    canEditSettings: isOwner,
    canAddTrack,
    canReorder: canAddTrack,
    canInvite: isOwner,
    canRemoveTrack: (addedById: string) => {
      if (isOwner) return true;
      if (!isCollaborator) return false;
      if (addedById === userId) return true;
      return collaboration?.canRemoveOthers === true || collaboration?.permission === "MODERATOR";
    },
  };
}
