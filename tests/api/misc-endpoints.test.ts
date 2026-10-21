// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { jsonRequest, prismaMock, routeParams } from "../helpers/api";

vi.mock("@/lib/db/prisma", async () => ({ prisma: (await import("../helpers/api")).prismaMock }));
vi.mock("@/lib/auth/session", () => ({ getAuthSession: vi.fn() }));

import { getAuthSession } from "@/lib/auth/session";
import { GET as discover } from "@/app/api/discover/route";
import { PUT as likeTrack, DELETE as unlikeTrack } from "@/app/api/favorites/tracks/[trackId]/route";
import { PUT as followArtist } from "@/app/api/favorites/artists/[artistId]/route";
import { GET as health } from "@/app/api/health/route";
import { POST as recordPlay, DELETE as clearHistory } from "@/app/api/history/route";
import { GET as library } from "@/app/api/library/route";
import { GET as insights } from "@/app/api/insights/route";
import { GET as recommendations } from "@/app/api/recommendations/route";
import { POST as createRoom } from "@/app/api/party/route";
import { GET as getRoom } from "@/app/api/party/[roomCode]/route";
import { GET as search } from "@/app/api/search/route";

const as = (userId: string | null) =>
  vi.mocked(getAuthSession).mockResolvedValue((userId ? { user: { id: userId } } : null) as any);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/discover input validation", () => {
  it("400s unknown filter values instead of crashing with a 500", async () => {
    for (const q of ["mood=BANANA", "activity=NOPE", "language=KLINGON"]) {
      const res = await discover(jsonRequest(`/api/discover?${q}`, "GET"));
      expect(res.status).toBe(400);
    }
    expect(prismaMock.track.findMany.mock.calls).toHaveLength(0);
  });

  it("passes valid filters through to the query", async () => {
    prismaMock.track.findMany.mockResolvedValue([]);
    const res = await discover(jsonRequest("/api/discover?mood=FOCUS&language=HINDI", "GET"));
    expect(res.status).toBe(200);
    expect(prismaMock.track.findMany.mock.calls[0]![0].where).toEqual({ moods: { has: "FOCUS" }, language: "HINDI" });
  });
});

describe("GET /api/search", () => {
  it("returns an empty result for a blank query without hitting the database", async () => {
    const res = await search(jsonRequest("/api/search?q=%20%20", "GET"));
    expect(res.status).toBe(200);
    expect(prismaMock.track.findMany.mock.calls).toHaveLength(0);
  });

  it("400s an over-long query", async () => {
    const res = await search(jsonRequest(`/api/search?q=${"a".repeat(101)}`, "GET"));
    expect(res.status).toBe(400);
  });
});

describe("user-scoped endpoints reject anonymous callers", () => {
  const cases: [string, () => Promise<Response>][] = [
    ["GET /library", () => library()],
    ["GET /insights", () => insights()],
    ["GET /recommendations", () => recommendations()],
    ["POST /history", () => recordPlay(jsonRequest("/", "POST", { trackId: "t" }))],
    ["DELETE /history", () => clearHistory()],
    ["PUT /favorites/tracks/:id", () => likeTrack(jsonRequest("/", "PUT"), routeParams({ trackId: "t" }))],
    ["DELETE /favorites/tracks/:id", () => unlikeTrack(jsonRequest("/", "DELETE"), routeParams({ trackId: "t" }))],
    ["POST /party", () => createRoom(jsonRequest("/", "POST", { name: "Room" }))],
  ];
  it.each(cases)("%s -> 401", async (_n, call) => {
    as(null);
    expect((await call()).status).toBe(401);
  });
});

describe("favorites / history edge cases", () => {
  it("404s (not 500) when liking or following something that doesn't exist", async () => {
    as("u1");
    prismaMock.favoriteTrack.upsert.mockRejectedValue({ code: "P2003" });
    prismaMock.followedArtist.upsert.mockRejectedValue({ code: "P2003" });
    expect((await likeTrack(jsonRequest("/", "PUT"), routeParams({ trackId: "ghost" }))).status).toBe(404);
    expect((await followArtist(jsonRequest("/", "PUT"), routeParams({ artistId: "ghost" }))).status).toBe(404);
  });

  it("scopes writes to the signed-in user, never a client-supplied id", async () => {
    as("u1");
    prismaMock.favoriteTrack.upsert.mockResolvedValue({});
    await likeTrack(jsonRequest("/", "PUT", { userId: "victim" }), routeParams({ trackId: "t1" }));
    expect(prismaMock.favoriteTrack.upsert.mock.calls[0]![0].create.userId).toBe("u1");
  });

  it("history: 400 without a trackId, 404 for an unknown track", async () => {
    as("u1");
    expect((await recordPlay(jsonRequest("/", "POST", {}))).status).toBe(400);
    expect((await recordPlay(jsonRequest("/", "POST", "{bad"))).status).toBe(400);
    prismaMock.track.findUnique.mockResolvedValue(null);
    expect((await recordPlay(jsonRequest("/", "POST", { trackId: "ghost" }))).status).toBe(404);
  });
});

describe("POST /api/party validation", () => {
  it("400s a missing or over-long room name", async () => {
    as("u1");
    expect((await createRoom(jsonRequest("/", "POST", {}))).status).toBe(400);
    expect((await createRoom(jsonRequest("/", "POST", { name: "x".repeat(61) }))).status).toBe(400);
  });

  it("creates a room hosted by the caller with a 6-char unambiguous code", async () => {
    as("u1");
    prismaMock.partyRoom.findUnique.mockResolvedValue(null);
    prismaMock.partyRoom.create.mockImplementation(async ({ data }: any) => data);
    const res = await createRoom(jsonRequest("/", "POST", { name: "Friday", hostId: "attacker" }));
    expect(res.status).toBe(201);
    const data = prismaMock.partyRoom.create.mock.calls[0]![0].data;
    expect(data.hostId).toBe("u1");
    expect(data.roomCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });
});

describe("GET /api/party/:roomCode", () => {
  it("rejects anonymous room lookups", async () => {
    as(null);
    const res = await getRoom(jsonRequest("/", "GET"), routeParams({ roomCode: "ABC123" }));
    expect(res.status).toBe(401);
    expect(prismaMock.partyRoom.findUnique.mock.calls).toHaveLength(0);
  });

  it("returns 404 for inactive or missing rooms", async () => {
    as("u1");
    prismaMock.partyRoom.findUnique.mockResolvedValueOnce(null);
    expect((await getRoom(jsonRequest("/", "GET"), routeParams({ roomCode: "ABC123" }))).status).toBe(404);

    prismaMock.partyRoom.findUnique.mockResolvedValueOnce({
      roomCode: "ABC123",
      name: "Friday",
      hostId: "u1",
      isActive: false,
      host: { name: "Host", username: "host" },
    });
    expect((await getRoom(jsonRequest("/", "GET"), routeParams({ roomCode: "ABC123" }))).status).toBe(404);
  });

  it("exposes room identity without leaking unrelated persistence fields", async () => {
    as("u1");
    prismaMock.partyRoom.findUnique.mockResolvedValue({
      id: "internal-id",
      roomCode: "ABC123",
      name: "Friday",
      hostId: "u1",
      isActive: true,
      host: { name: null, username: "host_user" },
      participants: [{ userId: "private" }],
    });

    const res = await getRoom(jsonRequest("/", "GET"), routeParams({ roomCode: "ABC123" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      data: {
        roomCode: "ABC123",
        name: "Friday",
        hostName: "host_user",
        isHost: true,
      },
    });
  });
});

describe("GET /api/health", () => {
  it("reports ok when the database answers", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    const res = await health();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", database: "up" });
  });

  it("503s without leaking error details when the database is down", async () => {
    prismaMock.$queryRaw.mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.5:5432 password=hunter2"));
    const res = await health();
    expect(res.status).toBe(503);
    const text = JSON.stringify(await res.json());
    expect(text).not.toMatch(/ECONNREFUSED|hunter2|10\.0\.0\.5/);
  });
});
