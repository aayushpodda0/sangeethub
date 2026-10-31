import { prisma } from "@/lib/db/prisma";
import { musicService } from "@/lib/music/service";
import type { ProviderTrack } from "@/lib/music/provider";
import { playlistRules } from "@/lib/playlists/rules";

export type PlaylistAccess = {
  playlist: NonNullable<Awaited<ReturnType<typeof loadPlaylist>>>;
  trackCatalog: Map<string, ProviderTrack>;
  isOwner: boolean;
  collaboration: { permission: "CONTRIBUTOR" | "MODERATOR"; canRemoveOthers: boolean } | null;
  canView: boolean;
  canEditSettings: boolean;
  canAddTrack: boolean;
  canReorder: boolean;
  canInvite: boolean;
  canRemoveTrack: (addedById: string) => boolean;
};

async function loadPlaylist(playlistId: string) {
  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId },
    include: {
      owner: { select: { id: true, name: true, username: true } },
      folder: { select: { id: true, name: true } },
      collaborations: {
        include: { user: { select: { id: true, name: true, username: true } } },
      },
      tracks: {
        orderBy: { position: "asc" },
        include: {
          addedBy: { select: { id: true, name: true, username: true } },
          track: { select: { id: true } },
        },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { actor: { select: { id: true, name: true, username: true } } },
      },
    },
  });
  if (!playlist) return null;

  return playlist;
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
  const tracks = await musicService.getTracksByIds(playlist.tracks.map((entry) => entry.track.id));

  const isOwner = userId !== undefined && playlist.ownerId === userId;
  const collaborationRow = userId
    ? playlist.collaborations.find((c) => c.userId === userId)
    : undefined;
  const collaboration = collaborationRow
    ? { permission: collaborationRow.permission, canRemoveOthers: collaborationRow.canRemoveOthers }
    : null;

  const isCollaborator = collaboration !== null;
  const canView = playlistRules.canView(playlist.isPublic, isOwner, isCollaborator);
  const canAddTrack =
    !playlist.isSmart && playlistRules.canAddTrack(isOwner, playlist.isCollaborative, isCollaborator);

  return {
    playlist,
    trackCatalog: new Map(tracks.map((track) => [track.id, track])),
    isOwner,
    collaboration,
    canView,
    canEditSettings: isOwner,
    canAddTrack,
    canReorder: canAddTrack,
    canInvite: isOwner,
    canRemoveTrack: (addedById: string) =>
      playlistRules.canRemoveTrack({ isOwner, collaboration, addedById, userId }),
  };
}
