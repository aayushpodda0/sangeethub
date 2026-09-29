import { apiError, apiSuccess } from "@/lib/api/response";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type RouteParams = { params: Promise<{ roomCode: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { roomCode } = await params;
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return apiError(401, "UNAUTHENTICATED", "You need to be signed in.");
  }

  try {
    const room = await prisma.partyRoom.findUnique({
      where: { roomCode },
      include: { host: { select: { name: true, username: true } } },
    });

    if (!room || !room.isActive) {
      return apiError(404, "ROOM_NOT_FOUND", "This party room doesn't exist or has ended.");
    }

    return apiSuccess({
      roomCode: room.roomCode,
      name: room.name,
      hostName: room.host.name ?? room.host.username,
      isHost: room.hostId === session.user.id,
    });
  } catch (error) {
    console.error("[party:info] failed:", error);
    return apiError(500, "PARTY_INFO_FAILED", "Couldn't load this room. Please try again.");
  }
}
