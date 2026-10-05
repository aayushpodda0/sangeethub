import { describe, expect, it } from "vitest";

import { createFolderSchema, renameFolderSchema } from "@/lib/playlists/folder-schemas";
import {
  addTrackSchema,
  createPlaylistSchema,
  reorderTracksSchema,
  updatePlaylistSchema,
} from "@/lib/playlists/schemas";

describe("createPlaylistSchema", () => {
  it("accepts a minimal valid payload", () => {
    expect(createPlaylistSchema.safeParse({ name: "Study Focus" }).success).toBe(true);
  });

  it("defaults isPublic to false when omitted", () => {
    const parsed = createPlaylistSchema.parse({ name: "Study Focus" });
    expect(parsed.isPublic).toBe(false);
  });

  it("rejects an empty name", () => {
    expect(createPlaylistSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects a name over 80 characters", () => {
    expect(createPlaylistSchema.safeParse({ name: "x".repeat(81) }).success).toBe(false);
  });

  it("rejects a description over 500 characters", () => {
    expect(
      createPlaylistSchema.safeParse({ name: "Valid", description: "x".repeat(501) }).success,
    ).toBe(false);
  });
});

describe("updatePlaylistSchema", () => {
  it("accepts a partial patch with only folderId", () => {
    expect(updatePlaylistSchema.safeParse({ folderId: "folder-123" }).success).toBe(true);
  });

  it("accepts folderId: null to unassign a folder", () => {
    expect(updatePlaylistSchema.safeParse({ folderId: null }).success).toBe(true);
  });

  it("rejects an invalid coverUrl", () => {
    expect(updatePlaylistSchema.safeParse({ coverUrl: "not-a-url" }).success).toBe(false);
  });

  it("accepts an empty patch (no-op update)", () => {
    expect(updatePlaylistSchema.safeParse({}).success).toBe(true);
  });
});

describe("addTrackSchema", () => {
  it("requires a non-empty trackId", () => {
    expect(addTrackSchema.safeParse({ trackId: "track-1" }).success).toBe(true);
    expect(addTrackSchema.safeParse({ trackId: "" }).success).toBe(false);
    expect(addTrackSchema.safeParse({}).success).toBe(false);
  });
});

describe("reorderTracksSchema", () => {
  it("requires at least one id", () => {
    expect(reorderTracksSchema.safeParse({ orderedPlaylistTrackIds: [] }).success).toBe(false);
    expect(reorderTracksSchema.safeParse({ orderedPlaylistTrackIds: ["a", "b"] }).success).toBe(true);
  });
});

describe("folder schemas", () => {
  it("accepts a valid folder name", () => {
    expect(createFolderSchema.safeParse({ name: "Road Trip" }).success).toBe(true);
    expect(renameFolderSchema.safeParse({ name: "Road Trip" }).success).toBe(true);
  });

  it("rejects an empty or overlong folder name", () => {
    expect(createFolderSchema.safeParse({ name: "" }).success).toBe(false);
    expect(createFolderSchema.safeParse({ name: "x".repeat(61) }).success).toBe(false);
  });
});
