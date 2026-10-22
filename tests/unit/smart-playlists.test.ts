import { describe, expect, it } from "vitest";

import { buildSmartPlaylistWhere } from "@/lib/playlists/smart-playlists";
import { smartRulesSchema } from "@/lib/playlists/schemas";

describe("smart playlist rules", () => {
  it("requires unique fields and validates rule limits", () => {
    expect(
      smartRulesSchema.safeParse([
        { field: "genre", value: "indie-pop" },
        { field: "genre", value: "rock" },
      ]).success,
    ).toBe(false);
    expect(
      smartRulesSchema.safeParse([{ field: "recentlyPlayed", withinDays: 30 }]).success,
    ).toBe(true);
  });

  it("requires rules when creating a smart playlist", async () => {
    const { createPlaylistSchema } = await import("@/lib/playlists/schemas");
    expect(createPlaylistSchema.safeParse({ name: "Empty smart", isSmart: true }).success).toBe(false);
    expect(
      createPlaylistSchema.safeParse({
        name: "Focused",
        isSmart: true,
        smartRules: [{ field: "mood", value: "FOCUS" }],
      }).success,
    ).toBe(true);
  });

  it("combines catalog and user-specific rules with AND semantics", () => {
    expect(
      buildSmartPlaylistWhere(
        [
          { field: "genre", value: "indie-pop" },
          { field: "liked", value: true },
          { field: "recentlyPlayed", withinDays: 14 },
        ],
        "user-1",
      ),
    ).toEqual({
      AND: [
        { genres: { some: { genre: { OR: [{ slug: "indie-pop" }, { name: "indie-pop" }] } } } },
        { favoritedBy: { some: { userId: "user-1" } } },
        { recentPlays: { some: { userId: "user-1", playedAt: { gte: expect.any(Date) } } } },
      ],
    });
  });

  it("supports release date operators", () => {
    const where = buildSmartPlaylistWhere(
      [{ field: "releaseDate", operator: "after", value: "2025-01-01T00:00:00.000Z" }],
      "user-1",
    );
    expect(where).toEqual({
      AND: [{ releaseDate: { gte: new Date("2025-01-01T00:00:00.000Z") } }],
    });
  });
});
