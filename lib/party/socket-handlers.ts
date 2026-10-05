import { getToken } from "next-auth/jwt";
import { VoteType } from "@prisma/client";
import type { Server, Socket } from "socket.io";

import { prisma } from "@/lib/db/prisma";
import { computePlaybackState } from "@/lib/party/playback-state";
import type {
  ClientToServerEvents,
  PartyParticipantInfo,
  PartyQueueItemInfo,
  ServerToClientEvents,
} from "@/lib/party/types";

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents> & {
  data: { userId: string; name: string; username: string; roomCode?: string };
};

function roomChannel(roomCode: string) {
  return `party:${roomCode}`;
}

function toClientVote(voteType: VoteType): "UP" | "DOWN" {
  return voteType === VoteType.UPVOTE ? "UP" : "DOWN";
}

async function loadParticipants(roomId: string): Promise<PartyParticipantInfo[]> {
  const rows = await prisma.partyParticipant.findMany({
    where: { roomId, disconnectedAt: null },
    include: { user: { select: { id: true, name: true, username: true } } },
  });
  return rows.map((r) => ({
    userId: r.user.id,
    name: r.user.name ?? r.user.username,
    username: r.user.username,
    role: r.role,
  }));
}

async function loadQueue(roomId: string, viewerUserId: string): Promise<PartyQueueItemInfo[]> {
  const items = await prisma.partyQueueItem.findMany({
    where: { roomId },
    include: {
      track: { include: { artists: { include: { artist: true } } } },
      addedBy: { select: { name: true, username: true } },
      votes: { where: { userId: viewerUserId }, select: { voteType: true } },
    },
    orderBy: [{ voteScore: "desc" }, { position: "asc" }],
  });

  return items.map((item) => ({
    id: item.id,
    trackId: item.trackId,
    trackTitle: item.track.title,
    artistNames: item.track.artists.map((a) => a.artist.name),
    durationSeconds: item.track.durationSeconds,
    previewUrl: item.track.previewUrl,
    addedById: item.addedById,
    addedByName: item.addedBy.name ?? item.addedBy.username,
    voteScore: item.voteScore,
    myVote: item.votes[0] ? toClientVote(item.votes[0].voteType) : null,
  }));
}

async function broadcastQueue(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  roomId: string,
  roomCode: string,
) {
  const sockets = await io.in(roomChannel(roomCode)).fetchSockets();
  for (const socket of sockets) {
    const userId = (socket.data as AppSocket["data"]).userId;
    const queue = await loadQueue(roomId, userId);
    socket.emit("queue:updated", queue);
  }
}

async function broadcastPlayback(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  roomCode: string,
  room: { currentTrackId: string | null; startedAt: Date | null; playbackPosition: number },
) {
  io.to(roomChannel(roomCode)).emit("playback:sync", computePlaybackState(room));
}

export function registerPartyHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  io.use(async (socket, next) => {
    try {
      const token = await getToken({
        req: socket.request as never,
        secret: process.env.NEXTAUTH_SECRET,
      });
      if (!token?.sub) {
        next(new Error("UNAUTHENTICATED"));
        return;
      }
      (socket.data as AppSocket["data"]) = {
        userId: token.sub,
        name: (token.name as string | null) ?? (token.username as string) ?? "Listener",
        username: (token.username as string) ?? "listener",
      };
      next();
    } catch {
      next(new Error("AUTH_FAILED"));
    }
  });

  io.on("connection", (rawSocket) => {
    const socket = rawSocket as AppSocket;

    socket.on("room:join", async (roomCode) => {
      try {
        const room = await prisma.partyRoom.findUnique({ where: { roomCode } });
        if (!room || !room.isActive) {
          socket.emit("room:error", { message: "This party room doesn't exist or has ended." });
          return;
        }

        const isHost = room.hostId === socket.data.userId;

        await prisma.partyParticipant.upsert({
          where: { roomId_userId: { roomId: room.id, userId: socket.data.userId } },
          create: {
            roomId: room.id,
            userId: socket.data.userId,
            role: isHost ? "HOST" : "GUEST",
          },
          update: { disconnectedAt: null },
        });

        socket.data.roomCode = roomCode;
        await socket.join(roomChannel(roomCode));

        const [participants, queue] = await Promise.all([
          loadParticipants(room.id),
          loadQueue(room.id, socket.data.userId),
        ]);

        socket.emit("room:state", {
          roomCode: room.roomCode,
          name: room.name,
          hostId: room.hostId,
          participants,
          queue,
          playback: computePlaybackState(room),
        });

        socket.to(roomChannel(roomCode)).emit("participant:joined", {
          userId: socket.data.userId,
          name: socket.data.name,
          username: socket.data.username,
          role: isHost ? "HOST" : "GUEST",
        });
      } catch (error) {
        console.error("[party:join] failed:", error);
        socket.emit("room:error", { message: "Couldn't join the room. Please try again." });
      }
    });

    socket.on("room:leave", async () => {
      await handleLeave(io, socket);
    });

    socket.on("disconnect", async () => {
      await handleLeave(io, socket);
    });

    socket.on("queue:add", async ({ trackId }) => {
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;

      try {
        const room = await prisma.partyRoom.findUnique({ where: { roomCode } });
        if (!room) return;

        const track = await prisma.track.findUnique({ where: { id: trackId }, select: { id: true } });
        if (!track) {
          socket.emit("room:error", { message: "That track doesn't exist." });
          return;
        }

        const count = await prisma.partyQueueItem.count({ where: { roomId: room.id } });
        await prisma.partyQueueItem.create({
          data: { roomId: room.id, trackId, addedById: socket.data.userId, position: count },
        });

        await broadcastQueue(io, room.id, roomCode);
      } catch (error) {
        console.error("[party:queue:add] failed:", error);
        socket.emit("room:error", { message: "Couldn't add that track. Please try again." });
      }
    });

    socket.on("queue:remove", async ({ queueItemId }) => {
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;

      try {
        const room = await prisma.partyRoom.findUnique({ where: { roomCode } });
        if (!room) return;

        const item = await prisma.partyQueueItem.findUnique({ where: { id: queueItemId } });
        if (!item || item.roomId !== room.id) return;

        const isHost = room.hostId === socket.data.userId;
        const isOwnAddition = item.addedById === socket.data.userId;
        if (!isHost && !isOwnAddition) {
          socket.emit("room:error", {
            message: "Only the host or the person who added it can remove this track.",
          });
          return;
        }

        await prisma.partyQueueItem.delete({ where: { id: queueItemId } });
        await broadcastQueue(io, room.id, roomCode);
      } catch (error) {
        console.error("[party:queue:remove] failed:", error);
        socket.emit("room:error", { message: "Couldn't remove that track. Please try again." });
      }
    });

    socket.on("queue:vote", async ({ queueItemId, voteType }) => {
      const roomCode = socket.data.roomCode;
      if (!roomCode) return;

      try {
        const room = await prisma.partyRoom.findUnique({ where: { roomCode } });
        if (!room) return;

        const queueItem = await prisma.partyQueueItem.findUnique({ where: { id: queueItemId } });
        if (!queueItem || queueItem.roomId !== room.id) return;

        const databaseVoteType = voteType === "UP" ? VoteType.UPVOTE : VoteType.DOWNVOTE;

        const existing = await prisma.queueVote.findUnique({
          where: { queueItemId_userId: { queueItemId, userId: socket.data.userId } },
        });

        if (existing && existing.voteType === databaseVoteType) {
          await prisma.queueVote.delete({ where: { id: existing.id } });
        } else if (existing) {
          await prisma.queueVote.update({
            where: { id: existing.id },
            data: { voteType: databaseVoteType },
          });
        } else {
          await prisma.queueVote.create({
            data: { queueItemId, userId: socket.data.userId, voteType: databaseVoteType },
          });
        }

        const [ups, downs] = await Promise.all([
          prisma.queueVote.count({ where: { queueItemId, voteType: VoteType.UPVOTE } }),
          prisma.queueVote.count({ where: { queueItemId, voteType: VoteType.DOWNVOTE } }),
        ]);
        await prisma.partyQueueItem.update({
          where: { id: queueItemId },
          data: { voteScore: ups - downs },
        });

        await broadcastQueue(io, room.id, roomCode);
      } catch (error) {
        console.error("[party:queue:vote] failed:", error);
        socket.emit("room:error", { message: "Couldn't register your vote. Please try again." });
      }
    });

    socket.on("playback:play", () => handleHostPlayback(io, socket, "play"));
    socket.on("playback:pause", () => handleHostPlayback(io, socket, "pause"));
    socket.on("playback:skip", () => handleHostPlayback(io, socket, "skip"));
    socket.on("playback:seek", (payload) => handleHostPlayback(io, socket, "seek", payload.positionSeconds));
    socket.on("playback:heartbeat", (payload) =>
      handleHostPlayback(io, socket, "heartbeat", payload.positionSeconds),
    );
  });

  async function handleHostPlayback(
    ioServer: Server<ClientToServerEvents, ServerToClientEvents>,
    socket: AppSocket,
    action: "play" | "pause" | "skip" | "seek" | "heartbeat",
    seekPosition?: number,
  ) {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;

    try {
      const room = await prisma.partyRoom.findUnique({ where: { roomCode } });
      if (!room) return;

      if (room.hostId !== socket.data.userId) {
        socket.emit("room:error", { message: "Only the host can control playback." });
        return;
      }

      const currentState = computePlaybackState(room);

      if (action === "play") {
        await prisma.partyRoom.update({
          where: { id: room.id },
          data: { startedAt: new Date(), playbackPosition: currentState.positionSeconds },
        });
      } else if (action === "pause") {
        await prisma.partyRoom.update({
          where: { id: room.id },
          data: { startedAt: null, playbackPosition: currentState.positionSeconds },
        });
      } else if (action === "seek" && seekPosition !== undefined) {
        await prisma.partyRoom.update({
          where: { id: room.id },
          data: { startedAt: currentState.isPlaying ? new Date() : null, playbackPosition: seekPosition },
        });
      } else if (action === "heartbeat" && seekPosition !== undefined) {
        await prisma.partyRoom.update({
          where: { id: room.id },
          data: { startedAt: new Date(), playbackPosition: seekPosition },
        });
      } else if (action === "skip") {
        const next = await prisma.partyQueueItem.findFirst({
          where: { roomId: room.id },
          orderBy: [{ voteScore: "desc" }, { position: "asc" }],
        });

        await prisma.$transaction(async (tx) => {
          if (next) {
            await tx.partyQueueItem.delete({ where: { id: next.id } });
          }
          await tx.partyRoom.update({
            where: { id: room.id },
            data: {
              currentTrackId: next?.trackId ?? null,
              startedAt: next ? new Date() : null,
              playbackPosition: 0,
            },
          });
        });

        await broadcastQueue(ioServer, room.id, roomCode);
      }

      const updated = await prisma.partyRoom.findUnique({ where: { id: room.id } });
      if (updated) {
        await broadcastPlayback(ioServer, roomCode, updated);
      }
    } catch (error) {
      console.error(`[party:playback:${action}] failed:`, error);
      socket.emit("room:error", { message: "Playback control failed. Please try again." });
    }
  }

  async function handleLeave(ioServer: Server<ClientToServerEvents, ServerToClientEvents>, socket: AppSocket) {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;

    try {
      const room = await prisma.partyRoom.findUnique({ where: { roomCode } });
      if (room) {
        await prisma.partyParticipant.updateMany({
          where: { roomId: room.id, userId: socket.data.userId },
          data: { disconnectedAt: new Date() },
        });
        ioServer.to(roomChannel(roomCode)).emit("participant:left", { userId: socket.data.userId });
      }
    } catch (error) {
      console.error("[party:leave] failed:", error);
    } finally {
      await socket.leave(roomChannel(roomCode));
      socket.data.roomCode = undefined;
    }
  }
}
