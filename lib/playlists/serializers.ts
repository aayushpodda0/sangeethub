import { toDiscoveryTrack } from "@/lib/music/serializers";
import type { PlaylistAccess } from "@/lib/playlists/authorization";

export function serializePlaylist(access: PlaylistAccess, viewerId: string | undefined) {
  const { playlist } = access;

  return {
    id: playlist.id,
    name: playlist.name,
    slug: playlist.slug,
    description: playlist.description,
    coverUrl: playlist.coverUrl,
    isPublic: playlist.isPublic,
    isCollaborative: playlist.isCollaborative,
    createdAt: playlist.createdAt,
    updatedAt: playlist.updatedAt,
    owner: playlist.owner,
    isOwner: access.isOwner,
    myPermission: access.collaboration?.permission ?? (access.isOwner ? "OWNER" : null),
    canEditSettings: access.canEditSettings,
    canAddTrack: access.canAddTrack,
    canReorder: access.canReorder,
    canInvite: access.canInvite,
    collaborators: playlist.collaborations.map((c) => ({
      userId: c.userId,
      name: c.user.name,
      username: c.user.username,
      permission: c.permission,
      canRemoveOthers: c.canRemoveOthers,
    })),
    tracks: playlist.tracks.map((entry) => ({
      playlistTrackId: entry.id,
      position: entry.position,
      addedAt: entry.addedAt,
      addedBy: entry.addedBy,
      canRemove: viewerId ? access.canRemoveTrack(entry.addedById) : false,
      track: toDiscoveryTrack(entry.track),
    })),
    activities: playlist.activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      message: activity.message,
      createdAt: activity.createdAt,
      actor: activity.actor,
    })),
  };
}

export type SerializedPlaylist = ReturnType<typeof serializePlaylist>;
