export type Collaboration = { permission: "CONTRIBUTOR" | "MODERATOR"; canRemoveOthers: boolean } | null;

/**
 * Pure authorization rules for playlists. Deliberately has zero imports (no Prisma, no Next) so
 * it can be unit-tested in isolation and reasoned about without any I/O.
 */
export const playlistRules = {
  canView: (isPublic: boolean, isOwner: boolean, isCollaborator: boolean) =>
    isPublic || isOwner || isCollaborator,

  canAddTrack: (isOwner: boolean, isCollaborative: boolean, isCollaborator: boolean) =>
    isOwner || (isCollaborative && isCollaborator),

  canRemoveTrack: (params: {
    isOwner: boolean;
    collaboration: Collaboration;
    addedById: string;
    userId: string | undefined;
  }) => {
    const { isOwner, collaboration, addedById, userId } = params;
    if (isOwner) return true;
    if (!collaboration) return false;
    if (addedById === userId) return true;
    return collaboration.canRemoveOthers === true || collaboration.permission === "MODERATOR";
  },
};
