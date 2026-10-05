import { describe, expect, it } from "vitest";

import { playlistRules } from "@/lib/playlists/rules";

describe("playlistRules.canView", () => {
  it("allows anyone to view a public playlist", () => {
    expect(playlistRules.canView(true, false, false)).toBe(true);
  });

  it("allows the owner to view a private playlist", () => {
    expect(playlistRules.canView(false, true, false)).toBe(true);
  });

  it("allows a collaborator to view a private playlist", () => {
    expect(playlistRules.canView(false, false, true)).toBe(true);
  });

  it("denies a stranger viewing a private playlist", () => {
    expect(playlistRules.canView(false, false, false)).toBe(false);
  });
});

describe("playlistRules.canAddTrack", () => {
  it("always allows the owner, regardless of collaboration settings", () => {
    expect(playlistRules.canAddTrack(true, false, false)).toBe(true);
  });

  it("allows a collaborator only when collaboration is enabled", () => {
    expect(playlistRules.canAddTrack(false, true, true)).toBe(true);
    expect(playlistRules.canAddTrack(false, false, true)).toBe(false);
  });

  it("denies a non-collaborator even if collaboration is enabled", () => {
    expect(playlistRules.canAddTrack(false, true, false)).toBe(false);
  });
});

describe("playlistRules.canRemoveTrack", () => {
  it("always allows the owner to remove any track", () => {
    expect(
      playlistRules.canRemoveTrack({
        isOwner: true,
        collaboration: null,
        addedById: "someone-else",
        userId: "owner-id",
      }),
    ).toBe(true);
  });

  it("denies a non-collaborator entirely", () => {
    expect(
      playlistRules.canRemoveTrack({
        isOwner: false,
        collaboration: null,
        addedById: "someone-else",
        userId: "stranger-id",
      }),
    ).toBe(false);
  });

  it("allows a contributor to remove their own addition", () => {
    expect(
      playlistRules.canRemoveTrack({
        isOwner: false,
        collaboration: { permission: "CONTRIBUTOR", canRemoveOthers: false },
        addedById: "user-1",
        userId: "user-1",
      }),
    ).toBe(true);
  });

  it("denies a contributor removing someone else's addition", () => {
    expect(
      playlistRules.canRemoveTrack({
        isOwner: false,
        collaboration: { permission: "CONTRIBUTOR", canRemoveOthers: false },
        addedById: "user-2",
        userId: "user-1",
      }),
    ).toBe(false);
  });

  it("allows a moderator to remove someone else's addition", () => {
    expect(
      playlistRules.canRemoveTrack({
        isOwner: false,
        collaboration: { permission: "MODERATOR", canRemoveOthers: false },
        addedById: "user-2",
        userId: "user-1",
      }),
    ).toBe(true);
  });

  it("allows a contributor with explicit canRemoveOthers to remove someone else's addition", () => {
    expect(
      playlistRules.canRemoveTrack({
        isOwner: false,
        collaboration: { permission: "CONTRIBUTOR", canRemoveOthers: true },
        addedById: "user-2",
        userId: "user-1",
      }),
    ).toBe(true);
  });
});
