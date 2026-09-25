import { randomBytes } from "crypto";

import { apiError, apiSuccess } from "@/lib/api/response";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getPlaylistAccess } from "@/lib/playlists/authorization";

type RouteParams = { params: Promise<{ id: string }> };

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function POST(_request: Request, { params }: RouteParams) {
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
  if (!access.canInvite) {
    return apiError(403, "FORBIDDEN", "Only the playlist owner can create invite links.");
  }

  try {
    const token = randomBytes(24).toString("base64url");

    const invite = await prisma.playlistInvite.create({
      data: {
        playlistId: id,
        token,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        createdById: userId,
      },
    });

    return apiSuccess({ token: invite.token, expiresAt: invite.expiresAt }, 201);
  } catch (error) {
    console.error("[playlists:invite] failed:", error);
    return apiError(500, "INVITE_CREATE_FAILED", "Couldn't create an invite link. Please try again.");
  }
}
