import { apiError, apiSuccess } from "@/lib/api/response";
import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function generateUniqueRoomCode() {
  for (let i = 0; i < 20; i += 1) {
    const code = generateRoomCode();
    const existing = await prisma.partyRoom.findUnique({ where: { roomCode: code } });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique room code");
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return apiError(401, "UNAUTHENTICATED", "You need to be signed in to start a party room.");
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const name = (json as { name?: unknown }).name;
  if (typeof name !== "string" || !name.trim()) {
    return apiError(400, "VALIDATION_ERROR", "Give your party room a name.");
  }
  if (name.length > 60) {
    return apiError(400, "VALIDATION_ERROR", "Room name is too long.");
  }

  try {
    const roomCode = await generateUniqueRoomCode();
    const room = await prisma.partyRoom.create({
      data: { roomCode, name: name.trim(), hostId: userId },
    });

    return apiSuccess({ roomCode: room.roomCode }, 201);
  } catch (error) {
    console.error("[party:create] failed:", error);
    return apiError(500, "PARTY_CREATE_FAILED", "Couldn't create the party room. Please try again.");
  }
}
