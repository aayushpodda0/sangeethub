// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { collaborator, jsonRequest, playlistFixture, prismaMock, routeParams, trackEntry } from "../helpers/api";

vi.mock("@/lib/db/prisma", async () => ({ prisma: (await import("../helpers/api")).prismaMock }));
vi.mock("@/lib/auth/session", () => ({ getAuthSession: vi.fn() }));

import { getAuthSession } from "@/lib/auth/session";
import { DELETE as removeCollaborator, PATCH as updateCollaborator } from "@/app/api/playlists/[id]/collaborators/[userId]/route";
import { POST as createInvite } from "@/app/api/playlists/[id]/invite/route";
import { DELETE as deletePlaylist, GET as getPlaylist, PATCH as patchPlaylist } from "@/app/api/playlists/[id]/route";
import { DELETE as removeTrack } from "@/app/api/playlists/[id]/tracks/[playlistTrackId]/route";
import { PATCH as reorderTracks } from "@/app/api/playlists/[id]/tracks/reorder/route";
import { POST as addTrack } from "@/app/api/playlists/[id]/tracks/route";
import { GET as previewInvite, POST as acceptInvite } from "@/app/api/playlists/join/[token]/route";
import { POST as createPlaylist } from "@/app/api/playlists/route";

const as = (userId: string | null) =>
  vi.mocked(getAuthSession).mockResolvedValue((userId ? { user: { id: userId } } : null) as any);
const body = async (res: Response) => (await res.json()) as any;
const activityTypes = () => prismaMock.playlistActivity.create.mock.calls.map((c: any[]) => c[0].data.type);

const P = routeParams({ id: "p1" });

beforeEach(() => {
  vi.resetAllMocks();
  prismaMock.playlist.findUnique.mockResolvedValue(playlistFixture());
});

describe("anonymous callers are rejected by every mutating endpoint", () => {
  const cases: [string, () => Promise<Response>][] = [
    ["POST /playlists", () => createPlaylist(jsonRequest("/api/playlists", "POST", { name: "x" }))],
    ["PATCH /playlists/:id", () => patchPlaylist(jsonRequest("/", "PATCH", { name: "x" }), P)],
    ["DELETE /playlists/:id", () => deletePlaylist(jsonRequest("/", "DELETE"), P)],
    ["POST /playlists/:id/tracks", () => addTrack(jsonRequest("/", "POST", { trackId: "t" }), P)],
    ["DELETE /playlists/:id/tracks/:entry", () => removeTrack(jsonRequest("/", "DELETE"), routeParams({ id: "p1", playlistTrackId: "e1" }))],
    ["PATCH /playlists/:id/tracks/reorder", () => reorderTracks(jsonRequest("/", "PATCH", { orderedPlaylistTrackIds: ["a"] }), P)],
    ["POST /playlists/:id/invite", () => createInvite(jsonRequest("/", "POST"), P)],
    ["PATCH /playlists/:id/collaborators/:user", () => updateCollaborator(jsonRequest("/", "PATCH", { permission: "MODERATOR" }), routeParams({ id: "p1", userId: "u" }))],
    ["DELETE /playlists/:id/collaborators/:user", () => removeCollaborator(jsonRequest("/", "DELETE"), routeParams({ id: "p1", userId: "u" }))],
    ["GET /playlists/join/:token", () => previewInvite(jsonRequest("/", "GET"), routeParams({ token: "t" }))],
    ["POST /playlists/join/:token", () => acceptInvite(jsonRequest("/", "POST"), routeParams({ token: "t" }))],
  ];

  it.each(cases)("%s -> 401", async (_name, call) => {
    as(null);
    const res = await call();
    expect(res.status).toBe(401);
    expect(prismaMock.playlist.update.mock.calls).toHaveLength(0);
    expect(prismaMock.playlist.delete.mock.calls).toHaveLength(0);
  });
});

describe("GET /playlists/:id visibility", () => {
  it("404s for a playlist that doesn't exist", async () => {
    as("owner");
    prismaMock.playlist.findUnique.mockResolvedValue(null);
    expect((await getPlaylist(jsonRequest("/", "GET"), P)).status).toBe(404);
  });

  it("403s a stranger on a private playlist", async () => {
    as("stranger");
    expect((await getPlaylist(jsonRequest("/", "GET"), P)).status).toBe(403);
  });

  it("lets anyone (even signed out) read a PUBLIC playlist", async () => {
    as(null);
    prismaMock.playlist.findUnique.mockResolvedValue(playlistFixture({ isPublic: true }));
    expect((await getPlaylist(jsonRequest("/", "GET"), P)).status).toBe(200);
  });

  it("lets a collaborator read a private playlist", async () => {
    as("c1");
    prismaMock.playlist.findUnique.mockResolvedValue(playlistFixture({ collaborations: [collaborator("c1")] }));
    expect((await getPlaylist(jsonRequest("/", "GET"), P)).status).toBe(200);
  });
});

describe("playlist settings: owner only", () => {
  it("PATCH 403s a collaborator and a stranger, and never writes", async () => {
    prismaMock.playlist.findUnique.mockResolvedValue(playlistFixture({ collaborations: [collaborator("c1", "MODERATOR", true)] }));
    for (const who of ["c1", "stranger"]) {
      as(who);
      expect((await patchPlaylist(jsonRequest("/", "PATCH", { name: "Hijacked" }), P)).status).toBe(403);
    }
    expect(prismaMock.playlist.update.mock.calls).toHaveLength(0);
  });

  it("PATCH rejects a javascript: cover URL (XSS vector)", async () => {
    as("owner");
    const res = await patchPlaylist(jsonRequest("/", "PATCH", { coverUrl: "javascript:alert(1)" }), P);
    expect(res.status).toBe(400);
    expect(prismaMock.playlist.update.mock.calls).toHaveLength(0);
  });

  it("PATCH refuses to move a playlist into a folder the user doesn't own", async () => {
    as("owner");
    prismaMock.playlistFolder.findUnique.mockResolvedValue({ id: "f1", userId: "someone-else" });
    const res = await patchPlaylist(jsonRequest("/", "PATCH", { folderId: "f1" }), P);
    expect(res.status).toBe(400);
    expect((await body(res)).error.code).toBe("INVALID_FOLDER");
  });

  it("PATCH lets the owner rename, logging a RENAMED activity", async () => {
    as("owner");
    const res = await patchPlaylist(jsonRequest("/", "PATCH", { name: "New Name" }), P);
    expect(res.status).toBe(200);
    expect(prismaMock.playlist.update.mock.calls[0]![0].data.name).toBe("New Name");
    expect(activityTypes()).toContain("RENAMED");
  });

  it("DELETE 403s a moderator but lets the owner delete", async () => {
    prismaMock.playlist.findUnique.mockResolvedValue(playlistFixture({ collaborations: [collaborator("c1", "MODERATOR", true)] }));
    as("c1");
    expect((await deletePlaylist(jsonRequest("/", "DELETE"), P)).status).toBe(403);
    expect(prismaMock.playlist.delete.mock.calls).toHaveLength(0);

    as("owner");
    expect((await deletePlaylist(jsonRequest("/", "DELETE"), P)).status).toBe(200);
    expect(prismaMock.playlist.delete.mock.calls).toHaveLength(1);
  });
});

describe("POST /playlists/:id/tracks", () => {
  beforeEach(() => {
    prismaMock.track.findUnique.mockResolvedValue({ id: "t9", title: "Monsoon Metro" });
  });
  const add = () => addTrack(jsonRequest("/", "POST", { trackId: "t9" }), P);

  it("403s a stranger even on a PUBLIC playlist (viewing != editing)", async () => {
    as("stranger");
    prismaMock.playlist.findUnique.mockResolvedValue(playlistFixture({ isPublic: true }));
    expect((await add()).status).toBe(403);
  });

  it("403s a collaborator while collaboration is switched OFF", async () => {
    as("c1");
    prismaMock.playlist.findUnique.mockResolvedValue(playlistFixture({ isCollaborative: false, collaborations: [collaborator("c1")] }));
    expect((await add()).status).toBe(403);
  });

  it("404s an unknown track and 409s a duplicate", async () => {
    as("owner");
    prismaMock.track.findUnique.mockResolvedValueOnce(null);
    expect((await add()).status).toBe(404);

    prismaMock.playlist.findUnique.mockResolvedValue(playlistFixture({ tracks: [trackEntry("e1", "t9", "owner")] }));
    expect((await add()).status).toBe(409);
  });

  it("lets a collaborator add, appends at the end, and logs TRACK_ADDED by them", async () => {
    as("c1");
    prismaMock.playlist.findUnique.mockResolvedValue(
      playlistFixture({ collaborations: [collaborator("c1")], tracks: [trackEntry("e1", "t1", "owner")] }),
    );
    const res = await add();
    expect(res.status).toBe(201);
    expect(prismaMock.playlistTrack.create.mock.calls[0]![0].data).toMatchObject({ trackId: "t9", addedById: "c1", position: 1 });
    expect(prismaMock.playlistActivity.create.mock.calls[0]![0].data).toMatchObject({ type: "TRACK_ADDED", actorId: "c1" });
  });

  it("400s a body without a trackId", async () => {
    as("owner");
    expect((await addTrack(jsonRequest("/", "POST", {}), P)).status).toBe(400);
  });
});

describe("DELETE /playlists/:id/tracks/:entry (remove permissions)", () => {
  const entries = [trackEntry("e-owner", "t1", "owner"), trackEntry("e-c1", "t2", "c1")];
  const remove = (entry: string) => removeTrack(jsonRequest("/", "DELETE"), routeParams({ id: "p1", playlistTrackId: entry }));

  beforeEach(() => {
    prismaMock.playlistTrack.findMany.mockResolvedValue([]);
    prismaMock.playlist.findUnique.mockResolvedValue(
      playlistFixture({
        tracks: entries,
        collaborations: [collaborator("c1"), collaborator("c2"), collaborator("mod", "MODERATOR", true)],
      }),
    );
  });

  it("a contributor cannot remove someone else's track", async () => {
    as("c2");
    expect((await remove("e-c1")).status).toBe(403);
    as("c1");
    expect((await remove("e-owner")).status).toBe(403);
    expect(prismaMock.playlistTrack.delete.mock.calls).toHaveLength(0);
  });

  it("a contributor CAN remove their own track", async () => {
    as("c1");
    expect((await remove("e-c1")).status).toBe(200);
    expect(activityTypes()).toContain("TRACK_REMOVED");
  });

  it("a moderator and the owner can remove anyone's track", async () => {
    as("mod");
    expect((await remove("e-c1")).status).toBe(200);
    as("owner");
    expect((await remove("e-c1")).status).toBe(200);
  });

  it("a stranger cannot remove anything; unknown entry is 404", async () => {
    as("stranger");
    expect((await remove("e-c1")).status).toBe(403);
    as("owner");
    expect((await remove("nope")).status).toBe(404);
  });
});

describe("PATCH /playlists/:id/tracks/reorder", () => {
  const withTracks = (extra: Record<string, any> = {}) =>
    prismaMock.playlist.findUnique.mockResolvedValue(
      playlistFixture({ tracks: [trackEntry("a", "t1", "owner"), trackEntry("b", "t2", "owner")], ...extra }),
    );
  const reorder = (ids: string[]) => reorderTracks(jsonRequest("/", "PATCH", { orderedPlaylistTrackIds: ids }), P);

  it("403s a stranger; 400s a list that doesn't match the playlist; 200s a valid reorder", async () => {
    withTracks();
    as("stranger");
    expect((await reorder(["b", "a"])).status).toBe(403);

    as("owner");
    expect((await reorder(["a"])).status).toBe(400);
    expect((await reorder(["a", "zzz"])).status).toBe(400);

    expect((await reorder(["b", "a"])).status).toBe(200);
    expect(activityTypes()).toContain("REORDERED");
  });
});

describe("collaborator management (owner only)", () => {
  beforeEach(() => {
    prismaMock.playlist.findUnique.mockResolvedValue(playlistFixture({ collaborations: [collaborator("c1"), collaborator("mod", "MODERATOR", true)] }));
  });
  const patch = (b: unknown, uid = "c1") => updateCollaborator(jsonRequest("/", "PATCH", b), routeParams({ id: "p1", userId: uid }));
  const del = (uid = "c1") => removeCollaborator(jsonRequest("/", "DELETE"), routeParams({ id: "p1", userId: uid }));

  it("neither a collaborator, a moderator, nor a stranger can promote or remove anyone", async () => {
    for (const who of ["c1", "mod", "stranger"]) {
      as(who);
      expect((await patch({ permission: "MODERATOR" })).status).toBe(403);
      expect((await del()).status).toBe(403);
    }
    expect(prismaMock.playlistCollaboration.update.mock.calls).toHaveLength(0);
    expect(prismaMock.playlistCollaboration.delete.mock.calls).toHaveLength(0);
  });

  it("owner: 404 for a non-collaborator, 400 for empty/invalid bodies", async () => {
    as("owner");
    expect((await patch({ permission: "MODERATOR" }, "ghost")).status).toBe(404);
    expect((await del("ghost")).status).toBe(404);
    expect((await patch({})).status).toBe(400);
    expect((await patch({ permission: "GOD" })).status).toBe(400);
  });

  it("owner can change a permission and remove a collaborator, each logged", async () => {
    as("owner");
    expect((await patch({ permission: "MODERATOR", canRemoveOthers: true })).status).toBe(200);
    expect(prismaMock.playlistCollaboration.update.mock.calls[0]![0].data).toEqual({ permission: "MODERATOR", canRemoveOthers: true });

    expect((await del()).status).toBe(200);
    expect(activityTypes()).toEqual(["COLLABORATOR_PERMISSION_CHANGED", "COLLABORATOR_REMOVED"]);
  });
});

describe("invites", () => {
  it("only the owner can create an invite; the token is long and random", async () => {
    prismaMock.playlist.findUnique.mockResolvedValue(playlistFixture({ collaborations: [collaborator("mod", "MODERATOR", true)] }));
    as("mod");
    expect((await createInvite(jsonRequest("/", "POST"), P)).status).toBe(403);

    as("owner");
    prismaMock.playlistInvite.create.mockImplementation(async ({ data }: any) => data); // echo the row, like Prisma
    const res = await createInvite(jsonRequest("/", "POST"), P);
    expect(res.status).toBe(201);
    const { token, expiresAt } = (await body(res)).data;
    expect(token.length).toBeGreaterThanOrEqual(30);
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  const invite = (over: Record<string, any> = {}) => ({
    token: "tok",
    playlistId: "p1",
    expiresAt: new Date(Date.now() + 60_000),
    playlist: { id: "p1", name: "Road Trip", ownerId: "owner", isCollaborative: false },
    createdBy: { name: "Owner", username: "owner" },
    ...over,
  });
  const tok = routeParams({ token: "tok" });

  it("404 for an invalid token and 410 for an expired one (no playlist details leaked)", async () => {
    as("joiner");
    prismaMock.playlistInvite.findUnique.mockResolvedValueOnce(null);
    const missing = await acceptInvite(jsonRequest("/", "POST"), tok);
    expect(missing.status).toBe(404);

    prismaMock.playlistInvite.findUnique.mockResolvedValueOnce(invite({ expiresAt: new Date(Date.now() - 1000) }));
    const expired = await previewInvite(jsonRequest("/", "GET"), tok);
    expect(expired.status).toBe(410);
    expect(JSON.stringify(await body(expired))).not.toContain("Road Trip");
  });

  it("the owner opening their own link is told they're already a member (no self-collaboration row)", async () => {
    as("owner");
    prismaMock.playlistInvite.findUnique.mockResolvedValue(invite());
    const res = await acceptInvite(jsonRequest("/", "POST"), tok);
    expect((await body(res)).data.alreadyMember).toBe(true);
    expect(prismaMock.playlistCollaboration.create.mock.calls).toHaveLength(0);
  });

  it("an existing collaborator re-using the link doesn't create a duplicate", async () => {
    as("joiner");
    prismaMock.playlistInvite.findUnique.mockResolvedValue(invite());
    prismaMock.playlistCollaboration.findUnique.mockResolvedValue({ userId: "joiner" });
    const res = await acceptInvite(jsonRequest("/", "POST"), tok);
    expect((await body(res)).data.alreadyMember).toBe(true);
    expect(prismaMock.playlistCollaboration.create.mock.calls).toHaveLength(0);
  });

  it("accepting creates a CONTRIBUTOR (never moderator), enables collaboration, and logs the join", async () => {
    as("joiner");
    prismaMock.playlistInvite.findUnique.mockResolvedValue(invite());
    prismaMock.playlistCollaboration.findUnique.mockResolvedValue(null);
    const res = await acceptInvite(jsonRequest("/", "POST"), tok);

    expect(res.status).toBe(200);
    expect(prismaMock.playlistCollaboration.create.mock.calls[0]![0].data).toMatchObject({
      userId: "joiner",
      permission: "CONTRIBUTOR",
      canRemoveOthers: false,
    });
    expect(prismaMock.playlist.update.mock.calls[0]![0].data).toEqual({ isCollaborative: true });
    expect(prismaMock.playlistActivity.create.mock.calls[0]![0].data).toMatchObject({ type: "COLLABORATOR_JOINED", actorId: "joiner" });
  });

  it("the preview endpoint doesn't join anyone", async () => {
    as("joiner");
    prismaMock.playlistInvite.findUnique.mockResolvedValue(invite());
    prismaMock.playlistCollaboration.findUnique.mockResolvedValue(null);
    const res = await previewInvite(jsonRequest("/", "GET"), tok);
    expect((await body(res)).data).toMatchObject({ playlistName: "Road Trip", alreadyMember: false });
    expect(prismaMock.playlistCollaboration.create.mock.calls).toHaveLength(0);
  });
});

describe("POST /playlists", () => {
  it("400s an empty name; creates a unique slug + CREATED activity for a valid one", async () => {
    as("u1");
    expect((await createPlaylist(jsonRequest("/", "POST", { name: "" }))).status).toBe(400);

    prismaMock.playlist.findUnique.mockResolvedValueOnce({ id: "taken" }).mockResolvedValueOnce(null);
    prismaMock.playlist.create.mockResolvedValue({ id: "new", slug: "my-mix-1" });
    const res = await createPlaylist(jsonRequest("/", "POST", { name: "My Mix" }));
    expect(res.status).toBe(201);
    expect(prismaMock.playlist.create.mock.calls[0]![0].data).toMatchObject({ ownerId: "u1", slug: "my-mix-1" });
    expect(activityTypes()).toEqual(["CREATED"]);
  });
});
