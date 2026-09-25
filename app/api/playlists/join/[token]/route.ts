import { apiError, apiSuccess } from "@/lib/api/response";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type RouteParams = { params: Promise<{ token: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  const { token } = await params;
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return apiError(401, "UNAUTHENTICATED", "You need to be signed in to accept an invite.");
  }

  try {
    const invite = await prisma.playlistInvite.findUnique({
      where: { token },
      include: { playlist: true },
    });

    if (!invite) {
      return apiError(404, "INVITE_NOT_FOUND", "This invite link is invalid.");
    }
    if (invite.expiresAt < new Date()) {
      return apiError(410, "INVITE_EXPIRED", "This invite link has expired.");
    }
    if (invite.playlist.ownerId === userId) {
      return apiSuccess({ playlistId: invite.playlistId, alreadyMember: true });
    }

    const existingCollaboration = await prisma.playlistCollaboration.findUnique({
      where: { playlistId_userId: { playlistId: invite.playlistId, userId } },
    });
    if (existingCollaboration) {
      return apiSuccess({ playlistId: invite.playlistId, alreadyMember: true });
    }

    await prisma.$transaction(async (tx) => {
      await tx.playlistCollaboration.create({
        data: {
          playlistId: invite.playlistId,
          userId,
          permission: "CONTRIBUTOR",
          canRemoveOthers: false,
        },
      });

      if (!invite.playlist.isCollaborative) {
        await tx.playlist.update({ where: { id: invite.playlistId }, data: { isCollaborative: true } });
      }
    });

    return apiSuccess({ playlistId: invite.playlistId, alreadyMember: false });
  } catch (error) {
    console.error("[playlists:join] failed:", error);
    return apiError(500, "JOIN_FAILED", "Couldn't join this playlist. Please try again.");
  }
}
