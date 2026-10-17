// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock } from "../helpers/api";

vi.mock("@/lib/db/prisma", async () => ({ prisma: (await import("../helpers/api")).prismaMock }));

import { getLikedTrackIds, isAlbumSaved, isFollowingArtist } from "@/lib/library/state";
import { DemoMusicProvider } from "@/lib/music/demo-provider";

const row = (id: string, over: Record<string, any> = {}) => ({
  id,
  title: `Track ${id}`,
  artworkUrl: null,
  previewUrl: "x.mp3",
  durationSeconds: 3,
  language: "HINDI",
  moods: ["RELAX"],
  activities: ["STUDY"],
  tempo: 90,
  popularity: 50,
  album: { title: "Album", artworkUrl: "/artwork/a.svg" },
  artists: [{ artist: { name: "Artist" } }],
  genres: [{ genre: { name: "Lo-fi" } }],
  ...over,
});

beforeEach(() => vi.resetAllMocks());

describe("library state helpers", () => {
  it("skips the database entirely for anonymous users or empty input", async () => {
    expect((await getLikedTrackIds(undefined, ["a"])).size).toBe(0);
    expect((await getLikedTrackIds("u1", [])).size).toBe(0);
    expect(await isFollowingArtist(undefined, "a")).toBe(false);
    expect(await isAlbumSaved(undefined, "a")).toBe(false);
    expect(prismaMock.favoriteTrack.findMany.mock.calls).toHaveLength(0);
    expect(prismaMock.followedArtist.findUnique.mock.calls).toHaveLength(0);
  });

  it("scopes the liked lookup to the user and the requested ids", async () => {
    prismaMock.favoriteTrack.findMany.mockResolvedValue([{ trackId: "b" }]);
    const liked = await getLikedTrackIds("u1", ["a", "b"]);
    expect([...liked]).toEqual(["b"]);
    expect(prismaMock.favoriteTrack.findMany.mock.calls[0]![0].where).toEqual({ userId: "u1", trackId: { in: ["a", "b"] } });
  });

  it("reports follow / saved state", async () => {
    prismaMock.followedArtist.findUnique.mockResolvedValue({ userId: "u1" });
    prismaMock.savedAlbum.findUnique.mockResolvedValue(null);
    expect(await isFollowingArtist("u1", "art")).toBe(true);
    expect(await isAlbumSaved("u1", "alb")).toBe(false);
  });
});

describe("DemoMusicProvider.getSimilarTracks", () => {
  const provider = new DemoMusicProvider();

  it("returns [] for an unknown track without querying candidates", async () => {
    prismaMock.track.findUnique.mockResolvedValue(null);
    expect(await provider.getSimilarTracks("ghost")).toEqual([]);
    expect(prismaMock.track.findMany.mock.calls).toHaveLength(0);
  });

  it("excludes the track itself, drops zero-score matches, and ranks by similarity then popularity", async () => {
    prismaMock.track.findUnique.mockResolvedValue(row("src"));
    prismaMock.track.findMany.mockResolvedValue([
      row("same-language-only", { moods: ["PARTY"], activities: ["GYM"], genres: [{ genre: { name: "Bhangra" } }], popularity: 99 }),
      row("strong", { popularity: 10 }),
      row("unrelated", { language: "TAMIL", moods: ["PARTY"], activities: ["GYM"], genres: [{ genre: { name: "Bhangra" } }] }),
      row("medium", { activities: ["GYM"], popularity: 80 }),
    ]);

    const result = await provider.getSimilarTracks("src", 5);

    expect(prismaMock.track.findMany.mock.calls[0]![0].where.id).toEqual({ not: "src" });
    expect(result.map((t) => t.id)).toEqual(["strong", "medium", "same-language-only"]);
  });

  it("respects the limit", async () => {
    prismaMock.track.findUnique.mockResolvedValue(row("src"));
    prismaMock.track.findMany.mockResolvedValue(["a", "b", "c", "d"].map((id) => row(id)));
    expect(await provider.getSimilarTracks("src", 2)).toHaveLength(2);
  });
});
