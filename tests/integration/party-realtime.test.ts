// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";

import { io as connect, type Socket as ClientSocket } from "socket.io-client";
import { Server } from "socket.io";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// ---- In-memory fake database (only the Prisma calls the party handlers make) ----
type Row = Record<string, any>;

const db = vi.hoisted(() => ({
  users: [] as Record<string, any>[],
  rooms: [] as Record<string, any>[],
  tracks: [] as Record<string, any>[],
  participants: [] as Record<string, any>[],
  queue: [] as Record<string, any>[],
  votes: [] as Record<string, any>[],
  seq: 0,
}));

vi.mock("@prisma/client", () => ({ VoteType: { UPVOTE: "UPVOTE", DOWNVOTE: "DOWNVOTE" } }));

vi.mock("next-auth/jwt", () => ({
  getToken: async ({ req }: { req: { headers: Record<string, string> } }) => {
    const user = db.users.find((u) => u.id === req.headers["x-test-user"]);
    return user ? { sub: user.id, name: user.name, username: user.username } : null;
  },
}));

vi.mock("@/lib/db/prisma", () => {
  const nextId = (p: string) => `${p}-${++db.seq}`;
  const byVotes = (a: Row, b: Row) => b.voteScore - a.voteScore || a.position - b.position;
  const prisma = {
    partyRoom: {
      findUnique: async ({ where }: Row) =>
        db.rooms.find((r) => (where.roomCode ? r.roomCode === where.roomCode : r.id === where.id)) ?? null,
      update: async ({ where, data }: Row) => Object.assign(db.rooms.find((r) => r.id === where.id)!, data),
    },
    partyParticipant: {
      upsert: async ({ where, create, update }: Row) => {
        const { roomId, userId } = where.roomId_userId;
        const existing = db.participants.find((p) => p.roomId === roomId && p.userId === userId);
        if (existing) return Object.assign(existing, update);
        const row = { ...create, disconnectedAt: null };
        db.participants.push(row);
        return row;
      },
      findMany: async ({ where }: Row) =>
        db.participants
          .filter((p) => p.roomId === where.roomId && p.disconnectedAt === null)
          .map((p) => ({ ...p, user: db.users.find((u) => u.id === p.userId) })),
      updateMany: async ({ where, data }: Row) => {
        db.participants
          .filter((p) => p.roomId === where.roomId && p.userId === where.userId)
          .forEach((p) => Object.assign(p, data));
      },
    },
    partyQueueItem: {
      count: async ({ where }: Row) => db.queue.filter((q) => q.roomId === where.roomId).length,
      create: async ({ data }: Row) => {
        // Mirror the real @@unique([roomId, position]) constraint so position bugs surface in tests.
        if (db.queue.some((q) => q.roomId === data.roomId && q.position === data.position)) {
          throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
        }
        const row = { id: nextId("q"), voteScore: 0, ...data };
        db.queue.push(row);
        return row;
      },
      aggregate: async ({ where }: Row) => {
        const positions = db.queue.filter((q) => q.roomId === where.roomId).map((q) => q.position);
        return { _max: { position: positions.length ? Math.max(...positions) : null } };
      },
      findUnique: async ({ where }: Row) => db.queue.find((q) => q.id === where.id) ?? null,
      findFirst: async ({ where }: Row) => db.queue.filter((q) => q.roomId === where.roomId).sort(byVotes)[0] ?? null,
      findMany: async ({ where }: Row) =>
        db.queue
          .filter((q) => q.roomId === where.roomId)
          .sort(byVotes)
          .map((q) => ({
            ...q,
            track: { ...db.tracks.find((t) => t.id === q.trackId)!, artists: [{ artist: { name: "Test Artist" } }] },
            addedBy: db.users.find((u) => u.id === q.addedById)!,
            votes: db.votes.filter((v) => v.queueItemId === q.id).map((v) => ({ userId: v.userId, voteType: v.voteType })),
          })),
      delete: async ({ where }: Row) => {
        db.queue.splice(db.queue.findIndex((q) => q.id === where.id), 1);
      },
      update: async ({ where, data }: Row) => Object.assign(db.queue.find((q) => q.id === where.id)!, data),
    },
    queueVote: {
      findUnique: async ({ where }: Row) => {
        const { queueItemId, userId } = where.queueItemId_userId;
        return db.votes.find((v) => v.queueItemId === queueItemId && v.userId === userId) ?? null;
      },
      create: async ({ data }: Row) => {
        const row = { id: nextId("v"), ...data };
        db.votes.push(row);
        return row;
      },
      update: async ({ where, data }: Row) => Object.assign(db.votes.find((v) => v.id === where.id)!, data),
      delete: async ({ where }: Row) => {
        db.votes.splice(db.votes.findIndex((v) => v.id === where.id), 1);
      },
      count: async ({ where }: Row) =>
        db.votes.filter((v) => v.queueItemId === where.queueItemId && v.voteType === where.voteType).length,
    },
    track: { findUnique: async ({ where }: Row) => db.tracks.find((t) => t.id === where.id) ?? null },
    $transaction: async (fn: (tx: unknown) => unknown) => fn(prisma),
  };
  return { prisma };
});

import { registerPartyHandlers } from "@/lib/party/socket-handlers";

// ---- Helpers ----
let httpServer: HttpServer;
let ioServer: Server;
let url: string;
const clients: ClientSocket[] = [];

function client(userId: string): ClientSocket {
  const socket = connect(url, {
    path: "/api/socket",
    transports: ["polling"],
    extraHeaders: { "x-test-user": userId },
    reconnection: false,
  });
  clients.push(socket);
  return socket;
}

const once = <T = any>(socket: ClientSocket, event: string) =>
  new Promise<T>((resolve) => socket.once(event, resolve));

const settle = (ms = 80) => new Promise((r) => setTimeout(r, ms));

async function joinBoth(roomCode = "ABC234") {
  const host = client("host");
  const guest = client("guest");
  await Promise.all([once(host, "connect"), once(guest, "connect")]);
  host.emit("room:join", roomCode);
  guest.emit("room:join", roomCode);
  await Promise.all([once(host, "room:state"), once(guest, "room:state")]);
  return { host, guest };
}

beforeAll(async () => {
  httpServer = createServer();
  ioServer = new Server(httpServer, { path: "/api/socket" });
  registerPartyHandlers(ioServer);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  url = `http://localhost:${(httpServer.address() as AddressInfo).port}`;
});

afterAll(async () => {
  clients.forEach((c) => c.disconnect());
  await ioServer.close(); // also closes the attached HTTP server and any open connections
});

beforeEach(() => {
  Object.assign(db, { participants: [], queue: [], votes: [], seq: 0 });
  db.users = [
    { id: "host", name: "Host", username: "host" },
    { id: "guest", name: "Guest", username: "guest" },
  ];
  db.tracks = [{ id: "t1", title: "Track One", durationSeconds: 200, previewUrl: "x.mp3" }];
  db.rooms = [
    { id: "r1", roomCode: "ABC234", name: "Room 1", hostId: "host", isActive: true, currentTrackId: null, startedAt: null, playbackPosition: 0 },
    { id: "r2", roomCode: "ZZZ999", name: "Room 2", hostId: "guest", isActive: true, currentTrackId: null, startedAt: null, playbackPosition: 0 },
  ];
  db.queue = [{ id: "q-other", roomId: "r2", trackId: "t1", addedById: "guest", position: 0, voteScore: 0 }];
});

describe("party room realtime behaviour", () => {
  it("rejects unauthenticated connections", async () => {
    const anon = client("nobody");
    const error = await new Promise<Error>((resolve) => anon.once("connect_error", resolve));
    expect(error.message).toBe("UNAUTHENTICATED");
  });

  it("rejects a malformed room code and an unknown room", async () => {
    const host = client("host");
    await once(host, "connect");

    host.emit("room:join", { not: "a string" });
    expect((await once(host, "room:error")).message).toMatch(/isn't valid/);

    host.emit("room:join", "NOPE22");
    expect((await once(host, "room:error")).message).toMatch(/doesn't exist/);
  });

  it("lets a guest join, and tells the host they arrived", async () => {
    const host = client("host");
    await once(host, "connect");
    host.emit("room:join", "ABC234");
    await once(host, "room:state");

    const guest = client("guest");
    await once(guest, "connect");
    const joined = once(host, "participant:joined");
    guest.emit("room:join", "ABC234");
    const state = await once(guest, "room:state");

    expect(state.participants.map((p: Row) => p.userId).sort()).toEqual(["guest", "host"]);
    expect((await joined).userId).toBe("guest");
  });

  it("tolerates a duplicate join from the same user (no duplicate participant)", async () => {
    const guest = client("guest");
    await once(guest, "connect");
    guest.emit("room:join", "ABC234");
    await once(guest, "room:state");
    guest.emit("room:join", "ABC234");
    const state = await once(guest, "room:state");

    expect(state.participants.filter((p: Row) => p.userId === "guest")).toHaveLength(1);
  });

  it("only lets the host control playback, and syncs both clients", async () => {
    const { host, guest } = await joinBoth();

    guest.emit("playback:play");
    expect((await once(guest, "room:error")).message).toMatch(/Only the host/);
    expect(db.rooms[0].startedAt).toBeNull();

    db.rooms[0].currentTrackId = "t1";
    const hostSync = once(host, "playback:sync");
    const guestSync = once(guest, "playback:sync");
    host.emit("playback:play");
    const [a, b] = await Promise.all([hostSync, guestSync]);
    expect(a.isPlaying).toBe(true);
    expect(b.isPlaying).toBe(true);
    expect(b.currentTrackId).toBe("t1");
  });

  it("survives malformed payloads without crashing the server", async () => {
    const guest = client("guest");
    await once(guest, "connect");
    guest.emit("room:join", "ABC234");
    await once(guest, "room:state");

    // None of these may throw on the server; each yields a clean error or is dropped.
    guest.emit("queue:vote");
    guest.emit("queue:add", null);
    guest.emit("queue:remove", "not-an-object");
    guest.emit("playback:seek", { positionSeconds: NaN });
    guest.emit("playback:heartbeat");
    await settle();

    // Server is still alive and responsive.
    guest.emit("room:join", "ABC234");
    expect((await once(guest, "room:state")).roomCode).toBe("ABC234");
  });

  it("blocks voting on a queue item that belongs to another room", async () => {
    const host = client("host");
    await once(host, "connect");
    host.emit("room:join", "ABC234");
    await once(host, "room:state");

    host.emit("queue:vote", { queueItemId: "q-other", voteType: "UP" });
    await settle();

    expect(db.votes).toHaveLength(0);
    expect(db.queue.find((q) => q.id === "q-other")!.voteScore).toBe(0);
  });

  it("orders the shared queue by votes and toggles a vote off on repeat", async () => {
    const { host, guest } = await joinBoth();

    db.tracks.push({ id: "t2", title: "Track Two", durationSeconds: 100, previewUrl: "y.mp3" });
    host.emit("queue:add", { trackId: "t1" });
    await settle();
    host.emit("queue:add", { trackId: "t2" });
    await settle();
    const [first, second] = db.queue.filter((q) => q.roomId === "r1");

    // Guest upvotes the SECOND track -> it should jump ahead.
    let update = once(host, "queue:updated");
    guest.emit("queue:vote", { queueItemId: second.id, voteType: "UP" });
    let queue = await update;
    expect(queue[0].id).toBe(second.id);
    expect(queue[0].voteScore).toBe(1);

    // Same vote again toggles it off.
    update = once(host, "queue:updated");
    guest.emit("queue:vote", { queueItemId: second.id, voteType: "UP" });
    queue = await update;
    expect(queue[0].id).toBe(first.id);
    expect(queue.find((q: Row) => q.id === second.id).voteScore).toBe(0);
  });

  it("lets only the host or the adder remove a queue item", async () => {
    const { host, guest } = await joinBoth();

    host.emit("queue:add", { trackId: "t1" });
    await settle();
    const item = db.queue.find((q) => q.roomId === "r1")!;

    guest.emit("queue:remove", { queueItemId: item.id });
    expect((await once(guest, "room:error")).message).toMatch(/Only the host or the person/);
    expect(db.queue.some((q) => q.id === item.id)).toBe(true);

    host.emit("queue:remove", { queueItemId: item.id });
    await settle();
    expect(db.queue.some((q) => q.id === item.id)).toBe(false);
  });

  it("can still add tracks after earlier items were removed or skipped (no position collision)", async () => {
    const { host } = await joinBoth();
    for (let i = 0; i < 3; i++) {
      host.emit("queue:add", { trackId: "t1" });
      await settle();
    }
    const [first] = db.queue.filter((q) => q.roomId === "r1");

    // Remove the FIRST item: positions are now [1, 2] but the row count is 2.
    host.emit("queue:remove", { queueItemId: first.id });
    await settle();
    expect(db.queue.filter((q) => q.roomId === "r1")).toHaveLength(2);

    host.emit("queue:add", { trackId: "t1" });
    await settle();

    const positions = db.queue.filter((q) => q.roomId === "r1").map((q) => q.position);
    expect(positions).toHaveLength(3);
    expect(new Set(positions).size).toBe(3); // all unique
  });

  it("refuses to grow a queue past the size cap", async () => {
    const { host } = await joinBoth();
    for (let i = 0; i < 100; i++) {
      db.queue.push({ id: `fill-${i}`, roomId: "r1", trackId: "t1", addedById: "host", position: i, voteScore: 0 });
    }

    host.emit("queue:add", { trackId: "t1" });
    expect((await once(host, "room:error")).message).toMatch(/queue is full/);
    expect(db.queue.filter((q) => q.roomId === "r1")).toHaveLength(100);
  });
});
